"""Itinerary packing list model for Tripify app."""

from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..database import Base


class ItineraryPackingList(Base):
    """Model for itinerary packing lists."""
    
    __tablename__ = "itinerary_packing_lists"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("itinerary_trips.id", ondelete="CASCADE"), nullable=False)
    item = Column(String(255), nullable=False)
    category = Column(String(100))  # clothing, electronics, documents, toiletries, etc.
    is_packed = Column(Boolean, default=False)
    quantity = Column(Integer, default=1)
    notes = Column(Text)
    added_by = Column(UUID(as_uuid=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    trip = relationship("ItineraryTrip", back_populates="packing_items")
