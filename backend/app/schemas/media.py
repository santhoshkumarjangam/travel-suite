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
    media_type: str = "image"
    mime_type: Optional[str] = "image/jpeg"
    is_favorite: bool
    created_at: datetime
    # We can join uploader name if needed, but for now ID is fine or we fetch separately.

    class Config:
        from_attributes = True
