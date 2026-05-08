from sqlalchemy import Column, String, Boolean, DateTime, BigInteger, Numeric, ForeignKey, Enum as SQLEnum, CheckConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import enum

class DiscountType(str, enum.Enum):
    percentage = "percentage"
    fixed_amount = "fixed_amount"

class Voucher(Base):
    __tablename__ = "vouchers"

    id = Column(BigInteger, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    discount_type = Column(SQLEnum(DiscountType), nullable=False)
    discount_value = Column(Numeric(12, 2), nullable=False)
    min_order_amount = Column(Numeric(12, 2), nullable=False, default=0)
    max_discount_amount = Column(Numeric(12, 2))
    total_quantity = Column(BigInteger, nullable=False)
    remaining_quantity = Column(BigInteger, nullable=False)
    max_usage_per_user = Column(BigInteger, nullable=False, default=1)
    valid_from = Column(DateTime(timezone=True), nullable=False)
    valid_until = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    event_vouchers = relationship("EventVoucher", back_populates="voucher", cascade="all, delete-orphan")
    redemptions = relationship("VoucherRedemption", back_populates="voucher")
    
    __table_args__ = (
        CheckConstraint('remaining_quantity >= 0', name='chk_voucher_remaining'),
    )

class EventVoucher(Base):
    __tablename__ = "event_vouchers"

    id = Column(BigInteger, primary_key=True, index=True)
    event_id = Column(BigInteger, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    voucher_id = Column(BigInteger, ForeignKey("vouchers.id", ondelete="CASCADE"), nullable=False)

    event = relationship("Event", back_populates="event_vouchers")
    voucher = relationship("Voucher", back_populates="event_vouchers")

class VoucherRedemption(Base):
    __tablename__ = "voucher_redemptions"

    id = Column(BigInteger, primary_key=True, index=True)
    voucher_id = Column(BigInteger, ForeignKey("vouchers.id"), nullable=False, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    booking_id = Column(BigInteger, ForeignKey("bookings.id"), nullable=False, unique=True)
    discount_applied = Column(Numeric(12, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    voucher = relationship("Voucher", back_populates="redemptions")
    # user = relationship("User")
    booking = relationship("Booking", back_populates="voucher_redemption")
