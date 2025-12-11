from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class UploadRequest(BaseModel):
    filename: str
    content_type: str
    trip_id: Optional[UUID] = None 
    size_bytes: int

class UploadResponse(BaseModel):
    upload_url: str 
    public_url: str 
    gcs_path: str
    photo_id: UUID

class PhotoResponse(BaseModel):
    id: UUID
    trip_id: Optional[UUID]
    uploader_id: UUID
    public_url: str
    thumbnail_url: Optional[str] = None
    filename: str
    media_type: str = "image"
    mime_type: Optional[str] = "image/jpeg"
    size_bytes: int
    is_favorite: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class MediaUpdate(BaseModel):
    """Schema for updating media."""
    is_favorite: Optional[bool] = None
