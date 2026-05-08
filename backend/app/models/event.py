from sqlalchemy import Column, String, Boolean, DateTime, BigInteger, Text, Integer, Numeric, ForeignKey, Enum as SQLEnum, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import enum

class EventStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    cancelled = "cancelled"
    completed = "completed"

class Venue(Base):
    __tablename__ = "venues"

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    capacity = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    events = relationship("Event", back_populates="venue")

class Event(Base):
    __tablename__ = "events"

    id = Column(BigInteger, primary_key=True, index=True)
    venue_id = Column(BigInteger, ForeignKey("venues.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    event_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(SQLEnum(EventStatus), nullable=False, default=EventStatus.draft)
    is_flash_sale = Column(Boolean, nullable=False, default=False)
    sale_start_at = Column(DateTime(timezone=True))
    sale_end_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    venue = relationship("Venue", back_populates="events")
    ticket_categories = relationship("TicketCategory", back_populates="event", cascade="all, delete-orphan")
    event_vouchers = relationship("EventVoucher", back_populates="event", cascade="all, delete-orphan")

class TicketCategory(Base):
    __tablename__ = "ticket_categories"

    id = Column(BigInteger, primary_key=True, index=True)
    event_id = Column(BigInteger, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    price = Column(Numeric(12, 2), nullable=False)
    total_quantity = Column(Integer, nullable=False)
    remaining_quantity = Column(Integer, nullable=False)
    max_per_booking = Column(Integer, nullable=False, default=5)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    event = relationship("Event", back_populates="ticket_categories")
    
    __table_args__ = (
        CheckConstraint('remaining_quantity >= 0', name='chk_remaining_quantity'),
    )
