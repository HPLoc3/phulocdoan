from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.models.event import EventStatus

class TicketCategoryResponse(BaseModel):
    id: int
    event_id: int
    name: str
    description: Optional[str] = None
    price: float
    total_quantity: int
    remaining_quantity: int
    max_per_booking: int

    class Config:
        from_attributes = True


class TicketCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    total_quantity: int
    max_per_booking: int = 5


class TicketCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    total_quantity: Optional[int] = None
    max_per_booking: Optional[int] = None

class EventResponse(BaseModel):
    id: int
    venue_id: int
    title: str
    description: Optional[str] = None
    event_date: datetime
    status: EventStatus
    is_flash_sale: bool
    sale_start_at: Optional[datetime]
    sale_end_at: Optional[datetime]
    created_at: datetime
    
    ticket_categories: List[TicketCategoryResponse] = []
    
    class Config:
        from_attributes = True

class EventCreate(BaseModel):
    venue_id: int
    title: str
    description: Optional[str] = None
    event_date: datetime
    status: EventStatus = EventStatus.draft
    is_flash_sale: bool = False
    sale_start_at: Optional[datetime] = None
    sale_end_at: Optional[datetime] = None

class EventUpdate(BaseModel):
    venue_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[datetime] = None
    status: Optional[EventStatus] = None
    is_flash_sale: Optional[bool] = None
    sale_start_at: Optional[datetime] = None
    sale_end_at: Optional[datetime] = None

# Refine Data Provider cần List Data Format
