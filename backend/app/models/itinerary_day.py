"""Itinerary day model for Tripify app."""

from sqlalchemy import Column, String, Date, DateTime, Text, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..database import Base


class ItineraryDay(Base):
    """Model for itinerary days."""
    
    __tablename__ = "itinerary_days"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("itinerary_trips.id", ondelete="CASCADE"), nullable=False)
    day_number = Column(Integer, nullable=False)
    date = Column(Date, nullable=False)
    title = Column(String(255))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    trip = relationship("ItineraryTrip", back_populates="days")
    activities = relationship("ItineraryActivity", back_populates="day", cascade="all, delete-orphan", order_by="ItineraryActivity.order_index")
    
    # Unique constraint
    __table_args__ = (
        UniqueConstraint('trip_id', 'day_number', name='uq_trip_day_number'),
    )
