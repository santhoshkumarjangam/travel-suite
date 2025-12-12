"""Itinerary trip model for Tripify app."""

from sqlalchemy import Column, String, Date, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import random
import string
from ..database import Base


def generate_join_code():
    """Generate a unique 6-character join code."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


class ItineraryTrip(Base):
    """Model for itinerary trips (separate from Galleriq/Economiq trips)."""
    
    __tablename__ = "itinerary_trips"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    destination = Column(String(255))
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    description = Column(Text)
    cover_image_url = Column(String(500))
    join_code = Column(String(6), unique=True, index=True, default=generate_join_code)
    created_by = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    members = relationship("ItineraryTripMember", back_populates="trip", cascade="all, delete-orphan")
    days = relationship("ItineraryDay", back_populates="trip", cascade="all, delete-orphan", order_by="ItineraryDay.day_number")
    packing_items = relationship("ItineraryPackingList", back_populates="trip", cascade="all, delete-orphan")


class ItineraryTripMember(Base):
    """Model for itinerary trip members."""
    
    __tablename__ = "itinerary_trip_members"
    
    trip_id = Column(UUID(as_uuid=True), ForeignKey("itinerary_trips.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role = Column(String(20), default='editor')  # owner, editor, viewer
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    trip = relationship("ItineraryTrip", back_populates="members")
