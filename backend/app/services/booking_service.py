from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.redis import redis_client
from app.models.booking import (
    Booking,
    BookingItem,
    BookingStatus,
    Payment,
    PaymentMethod,
    PaymentStatus,
)
from app.models.event import Event, EventStatus, TicketCategory
from app.models.voucher import Voucher, VoucherRedemption
from app.schemas.booking import BookingCreate


RESERVATION_TTL_MINUTES = 15
RESERVABLE_STATUSES = (
    BookingStatus.pending,
    BookingStatus.confirmed,
    BookingStatus.payment_pending,
)


class BookingService:
    @staticmethod
    async def create_booking(db: AsyncSession, user_id: int, payload: BookingCreate) -> Booking:
        idem_key = str(payload.idempotency_key)
        cached_booking = await redis_client.get(f"idempotency:{idem_key}")
        if cached_booking:
            raise HTTPException(status_code=409, detail="Duplicate booking request detected")

        category_ids = [item.ticket_category_id for item in payload.items]
        if len(category_ids) != len(set(category_ids)):
            raise HTTPException(status_code=400, detail="Moi hang ve chi duoc xuat hien mot lan trong booking")

        lock_name = f"lock:event:{payload.event_id}"
        async with redis_client.lock(name=lock_name, timeout=5, blocking_timeout=3) as lock:
            if not lock:
                raise HTTPException(status_code=503, detail="He thong dang qua tai, vui long thu lai sau giay lat")

            return await BookingService._process_booking_in_db(db, user_id, payload, idem_key)

    @staticmethod
    async def _process_booking_in_db(
        db: AsyncSession,
        user_id: int,
        payload: BookingCreate,
        idem_key: str,
    ) -> Booking:
        try:
            now = datetime.now(timezone.utc)

            event = (
                await db.execute(select(Event).where(Event.id == payload.event_id))
            ).scalar_one_or_none()
            if not event:
                raise HTTPException(status_code=404, detail="Event not found")
            if event.status != EventStatus.published:
                raise HTTPException(status_code=400, detail="Event is not open for booking")
            if event.sale_start_at and event.sale_start_at > now:
                raise HTTPException(status_code=400, detail="Sale has not started")
            if event.sale_end_at and event.sale_end_at < now:
                raise HTTPException(status_code=400, detail="Sale has ended")

            voucher = None
            if payload.voucher_code:
                result = await db.execute(
                    select(Voucher).where(Voucher.code == payload.voucher_code).with_for_update()
                )
                voucher = result.scalar_one_or_none()
                if not voucher or voucher.remaining_quantity <= 0:
                    raise HTTPException(status_code=400, detail="Voucher khong ton tai hoac da het")

            booking = Booking(
                user_id=user_id,
                event_id=payload.event_id,
                idempotency_key=idem_key,
                status=BookingStatus.pending,
                expires_at=now + timedelta(minutes=RESERVATION_TTL_MINUTES),
            )
            db.add(booking)
            await db.flush()

            subtotal = Decimal("0")

            for item in payload.items:
                stmt = (
                    select(TicketCategory)
                    .where(
                        TicketCategory.id == item.ticket_category_id,
                        TicketCategory.event_id == payload.event_id,
                    )
                    .with_for_update(skip_locked=False)
                )

                category = (await db.execute(stmt)).scalar_one_or_none()

                if not category:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Ticket category {item.ticket_category_id} not found",
                    )
                if item.quantity > category.max_per_booking:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Hang {category.name} chi cho phep toi da {category.max_per_booking} ve moi don",
                    )
                if category.remaining_quantity < item.quantity:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Khong du ve cho hang {category.name}. Con lai: {category.remaining_quantity}",
                    )

                category.remaining_quantity -= item.quantity

                line_total = category.price * item.quantity
                subtotal += line_total

                db.add(
                    BookingItem(
                        booking_id=booking.id,
                        ticket_category_id=category.id,
                        quantity=item.quantity,
                        unit_price=category.price,
                        line_total=line_total,
                    )
                )

            discount = Decimal("0")
            if voucher:
                if voucher.discount_type == "percentage":
                    discount = subtotal * (voucher.discount_value / Decimal("100"))
                    if voucher.max_discount_amount:
                        discount = min(discount, voucher.max_discount_amount)
                else:
                    discount = voucher.discount_value
                discount = min(discount, subtotal)

                voucher.remaining_quantity -= 1

                db.add(
                    VoucherRedemption(
                        voucher_id=voucher.id,
                        user_id=user_id,
                        booking_id=booking.id,
                        discount_applied=discount,
                    )
                )

            booking.subtotal = subtotal
            booking.discount_amount = discount
            booking.total_amount = max(Decimal("0"), subtotal - discount)

            if booking.total_amount > 0:
                booking.status = BookingStatus.payment_pending
                db.add(
                    Payment(
                        booking_id=booking.id,
                        method=payload.payment_method,
                        status=PaymentStatus.pending,
                        amount=booking.total_amount,
                    )
                )
            else:
                booking.status = BookingStatus.paid
                booking.expires_at = None

            await db.commit()
            await db.refresh(booking)

            await redis_client.setex(
                f"idempotency:{idem_key}",
                timedelta(hours=24),
                "processed",
            )

            return booking

        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def confirm_payment(db: AsyncSession, user_id: int, booking_id: int) -> Booking:
        booking = await BookingService._load_user_booking_for_update(db, user_id, booking_id)
        now = datetime.now(timezone.utc)

        if booking.status == BookingStatus.paid:
            return booking
        if booking.status in (BookingStatus.cancelled, BookingStatus.failed):
            raise HTTPException(status_code=400, detail="Booking khong con kha dung de thanh toan")

        if booking.expires_at and booking.expires_at <= now:
            await BookingService._release_reserved_resources(db, booking)
            booking.status = BookingStatus.cancelled
            booking.failure_reason = "Reservation expired"
            if booking.payment:
                booking.payment.status = PaymentStatus.failed
            await db.commit()
            raise HTTPException(status_code=400, detail="Booking da het han giu ve")

        if booking.total_amount <= 0:
            booking.status = BookingStatus.paid
            booking.expires_at = None
        else:
            if not booking.payment:
                booking.payment = Payment(
                    booking_id=booking.id,
                    method=PaymentMethod.ewallet,
                    status=PaymentStatus.pending,
                    amount=booking.total_amount,
                )
                db.add(booking.payment)

            booking.payment.status = PaymentStatus.completed
            booking.payment.paid_at = now
            booking.status = BookingStatus.paid
            booking.expires_at = None

        await db.commit()
        await db.refresh(booking)
        return booking

    @staticmethod
    async def cancel_booking(db: AsyncSession, user_id: int, booking_id: int) -> Booking:
        booking = await BookingService._load_user_booking_for_update(db, user_id, booking_id)

        if booking.status == BookingStatus.paid:
            raise HTTPException(status_code=400, detail="Booking da thanh toan, can luong hoan tien rieng")
        if booking.status in (BookingStatus.cancelled, BookingStatus.failed):
            return booking

        await BookingService._release_reserved_resources(db, booking)
        booking.status = BookingStatus.cancelled
        booking.failure_reason = "Cancelled by user"
        booking.expires_at = None
        if booking.payment:
            booking.payment.status = PaymentStatus.failed

        await db.commit()
        await db.refresh(booking)
        return booking

    @staticmethod
    async def expire_stale_bookings(db: AsyncSession, batch_size: int = 100) -> int:
        now = datetime.now(timezone.utc)
        stmt = (
            select(Booking)
            .where(
                Booking.status.in_(RESERVABLE_STATUSES),
                Booking.expires_at.is_not(None),
                Booking.expires_at <= now,
            )
            .options(
                selectinload(Booking.items),
                selectinload(Booking.payment),
                selectinload(Booking.voucher_redemption),
            )
            .order_by(Booking.expires_at.asc())
            .limit(batch_size)
            .with_for_update(skip_locked=True)
        )

        result = await db.execute(stmt)
        bookings = result.scalars().unique().all()
        for booking in bookings:
            await BookingService._release_reserved_resources(db, booking)
            booking.status = BookingStatus.cancelled
            booking.failure_reason = "Reservation expired"
            booking.expires_at = None
            if booking.payment:
                booking.payment.status = PaymentStatus.failed

        if bookings:
            await db.commit()
        return len(bookings)

    @staticmethod
    async def _load_user_booking_for_update(
        db: AsyncSession,
        user_id: int,
        booking_id: int,
    ) -> Booking:
        stmt = (
            select(Booking)
            .where(Booking.id == booking_id, Booking.user_id == user_id)
            .options(
                selectinload(Booking.items),
                selectinload(Booking.payment),
                selectinload(Booking.voucher_redemption),
            )
            .with_for_update()
        )
        booking = (await db.execute(stmt)).scalar_one_or_none()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        return booking

    @staticmethod
    async def _release_reserved_resources(db: AsyncSession, booking: Booking) -> None:
        if booking.status not in RESERVABLE_STATUSES:
            return

        for item in booking.items:
            category = (
                await db.execute(
                    select(TicketCategory)
                    .where(TicketCategory.id == item.ticket_category_id)
                    .with_for_update()
                )
            ).scalar_one_or_none()
            if category:
                category.remaining_quantity = min(
                    category.total_quantity,
                    category.remaining_quantity + item.quantity,
                )

        if booking.voucher_redemption:
            voucher = (
                await db.execute(
                    select(Voucher)
                    .where(Voucher.id == booking.voucher_redemption.voucher_id)
                    .with_for_update()
                )
            ).scalar_one_or_none()
            if voucher:
                voucher.remaining_quantity = min(
                    voucher.total_quantity,
                    voucher.remaining_quantity + 1,
                )
            await db.delete(booking.voucher_redemption)
            booking.voucher_redemption = None
