import json
from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from fastapi import HTTPException, status
from uuid import UUID

from app.models.booking import Booking, BookingItem, BookingStatus
from app.models.event import TicketCategory, Event
from app.models.voucher import Voucher, VoucherRedemption
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
            # Kiểm tra Voucher nếu có
            voucher = None
            if payload.voucher_code:
                result = await db.execute(
                    select(Voucher).where(Voucher.code == payload.voucher_code).with_for_update()
                )
                voucher = result.scalar_one_or_none()
                if not voucher or voucher.remaining_quantity <= 0:
                    raise HTTPException(status_code=400, detail="Voucher không tồn tại hoặc đã hết")

            # Khởi tạo booking
            booking = Booking(
                user_id=user_id,
                event_id=payload.event_id,
                idempotency_key=idem_key,
                status=BookingStatus.pending
            )
            db.add(booking)
            await db.flush() # Lấy booking.id

            subtotal = 0

            for item in payload.items:
                # Lớp 2: Pessimistic Lock Database (FOR UPDATE)
                stmt = select(TicketCategory).where(
                    TicketCategory.id == item.ticket_category_id,
                    TicketCategory.event_id == payload.event_id
                ).with_for_update(skip_locked=False)
                
                result = await db.execute(stmt)
                category = result.scalar_one_or_none()
                
                if not category:
                    raise HTTPException(status_code=404, detail=f"Ticket category {item.ticket_category_id} not found")
                
                if category.remaining_quantity < item.quantity:
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
                
            # Xử lý logic Voucher
            discount = 0
            if voucher:
                if voucher.discount_type == "percentage":
                    discount = float(subtotal) * (float(voucher.discount_value) / 100)
                    if voucher.max_discount_amount:
                        discount = min(discount, float(voucher.max_discount_amount))
                else:
                    discount = float(voucher.discount_value)
                
                # Trừ số lượng voucher
                voucher.remaining_quantity -= 1
                
                # Tạo bản ghi sử dụng voucher
                redemption = VoucherRedemption(
                    voucher_id=voucher.id,
                    user_id=user_id,
                    booking_id=booking.id,
                    discount_applied=discount
                )
                db.add(redemption)
            
            booking.subtotal = subtotal
            booking.discount_amount = discount
            booking.total_amount = max(0, subtotal - discount)
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
