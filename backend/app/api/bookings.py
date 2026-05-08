from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List

from app.db.database import get_db
from app.models.booking import Booking
from app.schemas.booking import BookingCreate, BookingResponse
from app.services.booking_service import BookingService

router = APIRouter()

# Tạm thời hardcode user_id vì chưa làm phần auth middleware hoàn chỉnh
async def get_current_user_id() -> int:
    return 3

@router.get("/", response_model=List[BookingResponse])
async def get_bookings(
    response: Response,
    _start: int = 0,
    _end: int = 10,
    _sort: str = "id",
    _order: str = "DESC",
    status: str = None,
    event_title_like: str = None,
    db: AsyncSession = Depends(get_db)
):
    """API lấy danh sách Booking cho Operation Dashboard (React Refine)"""
    limit = _end - _start
    offset = _start
    
    from sqlalchemy.orm import selectinload
    from app.models.event import Event
    
    stmt = select(Booking).options(selectinload(Booking.event))
    count_stmt = select(func.count()).select_from(Booking)
    
    # Filters
    if status:
        stmt = stmt.where(Booking.status == status)
        count_stmt = count_stmt.where(Booking.status == status)
        
    if event_title_like:
        stmt = stmt.join(Event).where(Event.title.ilike(f"%{event_title_like}%"))
        count_stmt = count_stmt.join(Event).where(Event.title.ilike(f"%{event_title_like}%"))
        
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
    user_id: int = Depends(get_current_user_id)
):
    """
    API đặt vé (Booking)
    - Yêu cầu truyền `idempotency_key` (UUID)
    - Xử lý lock nhiều tầng để chống overselling
    """
    try:
        booking = await BookingService.create_booking(db=db, user_id=user_id, payload=payload)
        return booking
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
