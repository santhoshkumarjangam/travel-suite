from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from ..database import Base

class Trip(Base):
    __tablename__ = "trips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    cover_photo_url = Column(String, nullable=True)
    join_code = Column(String(6), unique=True, index=True, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    members = relationship("TripMember", back_populates="trip")
    expenses = relationship("Expense", back_populates="trip")
    photos = relationship("Photo", back_populates="trip")

class TripMember(Base):
    __tablename__ = "trip_members"
    
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    role = Column(String, default="member")
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    trip = relationship("Trip", back_populates="members")
