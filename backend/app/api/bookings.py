from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List

from app.db.database import get_db
from app.models.booking import Booking, BookingItem
from app.models.event import TicketCategory
from app.models.user import User
from app.schemas.booking import (
    BookingCreate,
    BookingResponse,
    MyBookingResponse,
    BookingItemResponse,
)
from app.services.booking_service import BookingService
from app.core.deps import get_current_user

router = APIRouter()

from fastapi import Query

@router.get("/", response_model=List[BookingResponse])
async def get_bookings(
    response: Response,
    _start: int = 0,
    _end: int = 10,
    _sort: str = "id",
    _order: str = "DESC",
    status: str = None,
    event_title_like: str = None,
    created_at: List[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """API lấy danh sách Booking cho Operation Dashboard (React Refine)"""
    limit = _end - _start
    offset = _start
    
    from sqlalchemy.orm import selectinload
    from app.models.event import Event
    
    stmt = select(Booking).options(
        selectinload(Booking.event),
        selectinload(Booking.user)
    )
    count_stmt = select(func.count()).select_from(Booking)
    
    # Filters
    if status:
        stmt = stmt.where(Booking.status == status)
        count_stmt = count_stmt.where(Booking.status == status)
        
    if event_title_like:
        stmt = stmt.join(Event).where(Event.title.ilike(f"%{event_title_like}%"))
        count_stmt = count_stmt.join(Event).where(Event.title.ilike(f"%{event_title_like}%"))
        
    if created_at and len(created_at) == 2:
        from datetime import datetime
        try:
            start_date = datetime.fromisoformat(created_at[0].replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(created_at[1].replace('Z', '+00:00'))
            stmt = stmt.where(Booking.created_at >= start_date, Booking.created_at <= end_date)
            count_stmt = count_stmt.where(Booking.created_at >= start_date, Booking.created_at <= end_date)
        except ValueError:
            pass
        
    # Sorting
    if _sort and hasattr(Booking, _sort):
        order_col = getattr(Booking, _sort)
        stmt = stmt.order_by(order_col.desc() if _order.upper() == "DESC" else order_col.asc())
    else:
        stmt = stmt.order_by(Booking.id.desc())
    
    result = await db.execute(stmt.offset(offset).limit(limit))
    bookings = result.scalars().all()
    
    count_result = await db.execute(count_stmt)
    total = count_result.scalar()
    
    response.headers["Content-Range"] = f"bookings {_start}-{_start + len(bookings) - 1}/{total}"
    response.headers["X-Total-Count"] = str(total)
    
    return bookings

@router.get("/me", response_model=List[MyBookingResponse])
async def get_my_bookings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách booking của user hiện tại (kèm items + event)"""
    from sqlalchemy.orm import selectinload

    stmt = (
        select(Booking)
        .where(Booking.user_id == current_user.id)
        .options(selectinload(Booking.items), selectinload(Booking.event))
        .order_by(Booking.created_at.desc())
    )
    result = await db.execute(stmt)
    bookings = result.scalars().all()

    # Lấy tên ticket category cho từng item (1 query batch)
    cat_ids = {item.ticket_category_id for b in bookings for item in b.items}
    cat_map: dict[int, str] = {}
    if cat_ids:
        cat_stmt = select(TicketCategory.id, TicketCategory.name).where(TicketCategory.id.in_(cat_ids))
        cat_rows = await db.execute(cat_stmt)
        cat_map = {row.id: row.name for row in cat_rows}

    return [
        MyBookingResponse(
            id=b.id,
            event_id=b.event_id,
            event_title=b.event.title if b.event else None,
            event_date=b.event.event_date if b.event else None,
            status=b.status,
            subtotal=float(b.subtotal),
            discount_amount=float(b.discount_amount),
            total_amount=float(b.total_amount),
            expires_at=b.expires_at,
            created_at=b.created_at,
            items=[
                BookingItemResponse(
                    id=item.id,
                    ticket_category_id=item.ticket_category_id,
                    ticket_category_name=cat_map.get(item.ticket_category_id),
                    quantity=item.quantity,
                    unit_price=float(item.unit_price),
                    line_total=float(item.line_total),
                )
                for item in b.items
            ],
        )
        for b in bookings
    ]


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: int, db: AsyncSession = Depends(get_db)):
    """Lấy chi tiết 1 Booking"""
    stmt = select(Booking).where(Booking.id == booking_id)
    result = await db.execute(stmt)
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    return booking

@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    payload: BookingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    API đặt vé (Booking)
    - Yêu cầu Authorization: Bearer <token>
    - Yêu cầu truyền `idempotency_key` (UUID)
    - Xử lý lock nhiều tầng để chống overselling
    """
    try:
        booking = await BookingService.create_booking(db=db, user_id=current_user.id, payload=payload)
        return booking
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
