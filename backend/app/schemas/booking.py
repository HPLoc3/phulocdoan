from pydantic import BaseModel, Field, UUID4
from typing import List, Optional
from datetime import datetime
from app.models.booking import BookingStatus

# Request payload cho việc tạo booking
class BookingItemCreate(BaseModel):
    ticket_category_id: int
    quantity: int = Field(gt=0, description="Số lượng vé cần mua")

class BookingCreate(BaseModel):
    event_id: int
    idempotency_key: UUID4 = Field(..., description="UUID để chống duplicate request")
    items: List[BookingItemCreate] = Field(..., min_items=1)
    voucher_code: Optional[str] = None

# Response payload
class BookingResponse(BaseModel):
    id: int
    user_email: Optional[str] = None
    event_id: int
    event_title: Optional[str] = None
    status: BookingStatus
    subtotal: float
    discount_amount: float
    total_amount: float
    expires_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True
