from sqlalchemy import Column, String, DateTime, BigInteger, Numeric, ForeignKey, Enum as SQLEnum, Integer, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import enum

class BookingStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    payment_pending = "payment_pending"
    paid = "paid"
    cancelled = "cancelled"
    failed = "failed"

class PaymentMethod(str, enum.Enum):
    credit_card = "credit_card"
    bank_transfer = "bank_transfer"
    ewallet = "ewallet"

class PaymentStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    event_id = Column(BigInteger, ForeignKey("events.id"), nullable=False, index=True)
    idempotency_key = Column(UUID(as_uuid=True), unique=True, nullable=False)
    status = Column(SQLEnum(BookingStatus, name="booking_status"), nullable=False, default=BookingStatus.pending)
    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    discount_amount = Column(Numeric(12, 2), nullable=False, default=0)
    total_amount = Column(Numeric(12, 2), nullable=False, default=0)
    failure_reason = Column(String, nullable=True)
    expires_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    items = relationship("BookingItem", back_populates="booking", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="booking", uselist=False)
    voucher_redemption = relationship("VoucherRedemption", back_populates="booking", uselist=False)
    event = relationship("Event")
    user = relationship("User")

    @property
    def event_title(self) -> str:
        from sqlalchemy.orm.attributes import instance_state
        if 'event' in instance_state(self).dict:
            return self.event.title if self.event else None
        return None

    @property
    def user_email(self) -> str:
        from sqlalchemy.orm.attributes import instance_state
        if 'user' in instance_state(self).dict:
            return self.user.email if self.user else None
        return None

class BookingItem(Base):
    __tablename__ = "booking_items"

    id = Column(BigInteger, primary_key=True, index=True)
    booking_id = Column(BigInteger, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    ticket_category_id = Column(BigInteger, ForeignKey("ticket_categories.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    line_total = Column(Numeric(12, 2), nullable=False)

    booking = relationship("Booking", back_populates="items")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(BigInteger, primary_key=True, index=True)
    booking_id = Column(BigInteger, ForeignKey("bookings.id"), nullable=False, unique=True)
    transaction_id = Column(UUID(as_uuid=True), server_default=text("uuid_generate_v4()"), unique=True, nullable=False)
    method = Column(SQLEnum(PaymentMethod, name="payment_method"), nullable=False)
    status = Column(SQLEnum(PaymentStatus, name="payment_status"), nullable=False, default=PaymentStatus.pending)
    amount = Column(Numeric(12, 2), nullable=False)
    paid_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    booking = relationship("Booking", back_populates="payment")
