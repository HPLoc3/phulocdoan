from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List
from pydantic import BaseModel

from app.db.database import get_db
from app.models.event import Venue

router = APIRouter()

class VenueResponse(BaseModel):
    id: int
    name: str
    address: str
    city: str
    capacity: int
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[VenueResponse])
async def get_venues(
    response: Response,
    _start: int = 0,
    _end: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """API lấy danh sách Venues cho dropdown"""
    limit = _end - _start
    offset = _start
    
    stmt = select(Venue).offset(offset).limit(limit)
    result = await db.execute(stmt)
    venues = result.scalars().all()
    
    count_stmt = select(func.count()).select_from(Venue)
    count_result = await db.execute(count_stmt)
    total = count_result.scalar()
    
    response.headers["Content-Range"] = f"venues {_start}-{_start + len(venues) - 1}/{total}"
    response.headers["X-Total-Count"] = str(total)
    
    return venues
