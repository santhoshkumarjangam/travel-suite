from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID, uuid4
import os
from typing import List
from datetime import timedelta
from google.cloud import storage

from ..database import get_db
from ..models.photo import Photo
from ..models.trip import TripMember
from ..models.user import User
from ..schemas.media import UploadRequest, UploadResponse, PhotoResponse
from ..deps import get_current_user

router = APIRouter(prefix="/media", tags=["Media"])

# Config
BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "economiq-app-media")

@router.post("/upload-url", response_model=UploadResponse)
def generate_upload_url(
    req: UploadRequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # 1. Validation
    if req.trip_id:
        member = db.query(TripMember).filter(
            TripMember.trip_id == req.trip_id,
            TripMember.user_id == current_user.id
        ).first()
        if not member:
            raise HTTPException(status_code=403, detail="Not a member of this trip")
        folder = f"trips/{req.trip_id}"
    else:
        folder = f"users/{current_user.id}"

    # 2. Generate Path
    ext = req.filename.split('.')[-1] if '.' in req.filename else "jpg"
    photo_id = uuid4()
    gcs_path = f"{folder}/{photo_id}.{ext}"
    
    # 3. Signed URL
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(gcs_path)
        
        url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=15),
            method="PUT",
            content_type=req.content_type
        )
        public_url = f"https://storage.googleapis.com/{BUCKET_NAME}/{gcs_path}"
    except Exception as e:
        print(f"GCS Error: {e}")
        url = "http://localhost/mock-upload"
        public_url = "http://placehold.it/300" 

    # 4. Save Metadata
    new_photo = Photo(
        id=photo_id,
        trip_id=req.trip_id,
        uploader_id=current_user.id,
        gcs_path=gcs_path,
        public_url=public_url,
        media_type="video" if "video" in req.content_type else "image",
        mime_type=req.content_type,
        size_bytes=req.size_bytes
    )
    db.add(new_photo)
    db.commit()
    
    return UploadResponse(
        upload_url=url,
        public_url=public_url,
        gcs_path=gcs_path,
        photo_id=photo_id
    )

@router.get("/trip/{trip_id}", response_model=List[PhotoResponse])
def get_trip_photos(trip_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Check Membership
    member = db.query(TripMember).filter(
        TripMember.trip_id == trip_id,
        TripMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this trip")

    # 2. Fetch Photos
    photos = db.query(Photo).filter(Photo.trip_id == trip_id).order_by(Photo.created_at.desc()).all()
    return photos
