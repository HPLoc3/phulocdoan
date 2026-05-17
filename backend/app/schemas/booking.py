from pydantic import BaseModel, Field, UUID4
from typing import List, Optional
from datetime import datetime
from app.models.booking import BookingStatus, PaymentMethod

# Request payload cho việc tạo booking
class BookingItemCreate(BaseModel):
    ticket_category_id: int
    quantity: int = Field(gt=0, description="Số lượng vé cần mua")

class BookingCreate(BaseModel):
    event_id: int
    idempotency_key: UUID4 = Field(..., description="UUID để chống duplicate request")
    items: List[BookingItemCreate] = Field(..., min_items=1)
    voucher_code: Optional[str] = None
    payment_method: PaymentMethod = PaymentMethod.ewallet

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


class BookingItemResponse(BaseModel):
    id: int
    ticket_category_id: int
    ticket_category_name: Optional[str] = None
    quantity: int
    unit_price: float
    line_total: float

    class Config:
        from_attributes = True


class MyBookingResponse(BaseModel):
    id: int
    event_id: int
    event_title: Optional[str] = None
    event_date: Optional[datetime] = None
    status: BookingStatus
    subtotal: float
    discount_amount: float
    total_amount: float
    expires_at: Optional[datetime]
    created_at: datetime
    items: List[BookingItemResponse] = []

    class Config:
        from_attributes = True
