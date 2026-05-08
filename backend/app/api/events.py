from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from typing import List

from app.db.database import get_db
from app.models.event import Event
from app.schemas.event import EventResponse

router = APIRouter()

@router.get("/", response_model=List[EventResponse])
async def get_events(
    response: Response,
    _start: int = 0,
    _end: int = 10,
    _sort: str = "id",
    _order: str = "DESC",
    title_like: str = None,
    status: str = None,
    db: AsyncSession = Depends(get_db)
):
    """
    API lấy danh sách Events cho Operation Dashboard (React Refine).
    Hỗ trợ Pagination, Sorting, Filtering và trả về Content-Range header.
    """
    limit = _end - _start
    offset = _start
    
    stmt = select(Event).options(selectinload(Event.ticket_categories))
    count_stmt = select(func.count()).select_from(Event)
    
    # Áp dụng Filters
    if title_like:
        stmt = stmt.where(Event.title.ilike(f"%{title_like}%"))
        count_stmt = count_stmt.where(Event.title.ilike(f"%{title_like}%"))
    if status:
        stmt = stmt.where(Event.status == status)
        count_stmt = count_stmt.where(Event.status == status)
        
    # Áp dụng Sắp xếp
    if _sort and hasattr(Event, _sort):
        order_col = getattr(Event, _sort)
        stmt = stmt.order_by(order_col.desc() if _order.upper() == "DESC" else order_col.asc())
    else:
        stmt = stmt.order_by(Event.id.desc())
    
    result = await db.execute(stmt.offset(offset).limit(limit))
    events = result.scalars().all()
    
    count_result = await db.execute(count_stmt)
    total = count_result.scalar()
    
    # Trả về headers cho React Refine
    response.headers["Content-Range"] = f"events {_start}-{_start + len(events) - 1}/{total}"
    response.headers["X-Total-Count"] = str(total)
    
    return events

@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: int, db: AsyncSession = Depends(get_db)):
    """Lấy chi tiết 1 Event"""
    stmt = select(Event).options(selectinload(Event.ticket_categories)).where(Event.id == event_id)
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()
    
    if not event:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Event not found")
        
    return event

from app.schemas.event import EventCreate, EventUpdate
from fastapi import status

@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(payload: EventCreate, db: AsyncSession = Depends(get_db)):
    """Tạo mới 1 Event"""
    new_event = Event(**payload.model_dump())
    db.add(new_event)
    await db.commit()
    await db.refresh(new_event)
    return new_event

@router.patch("/{event_id}", response_model=EventResponse)
async def update_event(event_id: int, payload: EventUpdate, db: AsyncSession = Depends(get_db)):
    """Sửa Event"""
    stmt = select(Event).where(Event.id == event_id)
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()
    
    if not event:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Event not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(event, key, value)
        
    await db.commit()
    await db.refresh(event)
    return event

@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(event_id: int, db: AsyncSession = Depends(get_db)):
    """Xóa Event"""
    stmt = select(Event).where(Event.id == event_id)
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()
    
    if not event:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Event not found")
        
    await db.delete(event)
    await db.commit()
    return None
