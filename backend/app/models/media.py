"""Media model for storing photo/video metadata."""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from ..database import Base


class Media(Base):
    """Model for media files (photos/videos) stored in GCS."""
    
    __tablename__ = "media"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE"), nullable=True)
    
    # GCS Storage
    gcs_path = Column(String, nullable=False)  # Relative path in bucket
    public_url = Column(String, nullable=False)  # Full HTTPS URL
    thumbnail_url = Column(String, nullable=True)  # Thumbnail URL (if generated)
    
    # File metadata
    filename = Column(String, nullable=False)  # Original filename
    mime_type = Column(String, nullable=False)  # e.g., image/jpeg, video/mp4
    size_bytes = Column(Integer, nullable=False)
    
    # User preferences
    is_favorite = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="media")
    trip = relationship("Trip", back_populates="media")
