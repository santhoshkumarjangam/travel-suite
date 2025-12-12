"""Itinerary activity model for Tripify app."""

from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey, Time, Numeric, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..database import Base


class ItineraryActivity(Base):
    """Model for itinerary activities."""
    
    __tablename__ = "itinerary_activities"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    day_id = Column(UUID(as_uuid=True), ForeignKey("itinerary_days.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    activity_type = Column(String(50))  # sightseeing, food, transport, accommodation, shopping, entertainment, other
    start_time = Column(Time)
    end_time = Column(Time)
    duration = Column(Integer)  # minutes
    location = Column(String(255))
    location_lat = Column(Numeric(10, 8))
    location_lng = Column(Numeric(11, 8))
    maps_link = Column(String(500))
    cost = Column(Numeric(10, 2))
    currency = Column(String(3), default='USD')
    booking_url = Column(String(500))
    notes = Column(Text)
    image_url = Column(String(500))  # GCS URL for activity photo
    assigned_to = Column(UUID(as_uuid=True))
    order_index = Column(Integer, nullable=False)
    is_completed = Column(Boolean, default=False)  # Track if activity is done/visited
    created_by = Column(UUID(as_uuid=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    day = relationship("ItineraryDay", back_populates="activities")
