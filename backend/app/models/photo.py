from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, BigInteger, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from ..database import Base

class Photo(Base):
    __tablename__ = "photos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id"), nullable=True) # Nullable if personal collection? Assume yes for now.
    uploader_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    gcs_path = Column(Text, nullable=False)
    public_url = Column(Text, nullable=False)
    media_type = Column(String, default="image")
    mime_type = Column(String, nullable=True)
    size_bytes = Column(BigInteger, nullable=True)
    is_favorite = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    trip = relationship("Trip", back_populates="photos")
