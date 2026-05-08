import json
from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from fastapi import HTTPException, status
from uuid import UUID

from app.models.booking import Booking, BookingItem, BookingStatus
from app.models.event import TicketCategory, Event
from app.schemas.booking import BookingCreate
from app.core.redis import redis_client

class BookingService:
    @staticmethod
    async def create_booking(db: AsyncSession, user_id: int, payload: BookingCreate) -> Booking:
        # Lớp 0: Chống duplicate (Idempotency)
        idem_key = str(payload.idempotency_key)
        cached_booking = await redis_client.get(f"idempotency:{idem_key}")
        if cached_booking:
            # Nếu request đã từng được xử lý, trả lại kết quả cũ (hoặc báo lỗi tuỳ policy)
            raise HTTPException(status_code=409, detail="Duplicate booking request detected")

        # Lớp 1: Distributed Lock (Redis Gatekeeper)
        # Sắp xếp để tránh deadlock nếu mua nhiều category cùng lúc
        category_ids = sorted([item.ticket_category_id for item in payload.items])
        
        # Lấy lock toàn bộ category cần mua trong 1 request này
        # (Để đơn giản, có thể dùng Redis lock cho toàn bộ event, nhưng lock theo category sẽ tối ưu concurrency hơn)
        # Dùng setnx cơ bản hoặc lock của redis-py
        lock_name = f"lock:event:{payload.event_id}"
        
        # Thử lấy lock, timeout sau 3s (chờ), lock tự nhả sau 5s (phòng hờ crash)
        async with redis_client.lock(name=lock_name, timeout=5, blocking_timeout=3) as lock:
            if not lock:
                raise HTTPException(status_code=503, detail="Hệ thống đang quá tải, vui lòng thử lại sau giây lát")

            # Xử lý trong transaction database
            return await BookingService._process_booking_in_db(db, user_id, payload, idem_key)

    @staticmethod
    async def _process_booking_in_db(db: AsyncSession, user_id: int, payload: BookingCreate, idem_key: str) -> Booking:
        try:
            # Tính tổng tiền
            subtotal = 0
            
            # Khởi tạo booking
            booking = Booking(
                user_id=user_id,
                event_id=payload.event_id,
                idempotency_key=idem_key,
                status=BookingStatus.pending
            )
            db.add(booking)
            await db.flush() # Để lấy booking.id

            for item in payload.items:
                # Lớp 2: Pessimistic Lock Database (FOR UPDATE)
                # Chỉ lock đúng dòng category này.
                stmt = select(TicketCategory).where(
                    TicketCategory.id == item.ticket_category_id,
                    TicketCategory.event_id == payload.event_id
                ).with_for_update(skip_locked=False) # skip_locked=True nếu dùng queue
                
                result = await db.execute(stmt)
                category = result.scalar_one_or_none()
                
                if not category:
                    raise HTTPException(status_code=404, detail=f"Ticket category {item.ticket_category_id} not found")
                
                if category.remaining_quantity < item.quantity:
                    # Lớp 3: Constraint DB sẽ bắt nếu lọt qua bước này, nhưng ta chủ động báo lỗi sớm
                    raise HTTPException(status_code=400, detail=f"Không đủ vé cho hạng {category.name}. Còn lại: {category.remaining_quantity}")
                
                # Cập nhật số vé
                category.remaining_quantity -= item.quantity
                
                # Tính tiền
                line_total = category.price * item.quantity
                subtotal += line_total
                
                # Thêm item
                booking_item = BookingItem(
                    booking_id=booking.id,
                    ticket_category_id=category.id,
                    quantity=item.quantity,
                    unit_price=category.price,
                    line_total=line_total
                )
                db.add(booking_item)
                
            # Todo: Xử lý logic Voucher ở đây nếu payload.voucher_code có gía trị
            discount = 0
            
            booking.subtotal = subtotal
            booking.discount_amount = discount
            booking.total_amount = subtotal - discount
            booking.status = BookingStatus.confirmed
            
            # Commit mọi thay đổi
            await db.commit()
            await db.refresh(booking)
            
            # Lưu idempotency key vào Redis để dùng cho các request retry
            await redis_client.setex(
                f"idempotency:{idem_key}", 
                timedelta(hours=24), # Giữ trong 24h
                "processed"
            )
            
            return booking
            
        except Exception as e:
            await db.rollback()
            raise e
