from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from ..database import get_db
from ..models.media import Media
from ..models.trip import TripMember
from ..models.user import User
from ..schemas.media import UploadRequest, UploadResponse, PhotoResponse, MediaUpdate
from ..deps import get_current_user, get_current_user_optional
from ..services.gcs import get_gcs_service

router = APIRouter(prefix="/media", tags=["Media"])


@router.post("/upload", response_model=PhotoResponse)
async def upload_media(
    file: UploadFile = File(...),
    trip_id: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a photo/video directly to GCS.
    
    This endpoint handles the file upload in one step:
    1. Validates user has access to trip (if specified)
    2. Uploads file to GCS
    3. Saves metadata to database
    4. Returns media info with public URL
    """
    # 1. Validation
    trip_uuid = UUID(trip_id) if trip_id else None
    
    if trip_uuid:
        member = db.query(TripMember).filter(
            TripMember.trip_id == trip_uuid,
            TripMember.user_id == current_user.id
        ).first()
        if not member:
            raise HTTPException(status_code=403, detail="Not a member of this trip")
    
    # 2. Upload to GCS
    gcs_service = get_gcs_service()
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Upload to GCS
        from io import BytesIO
        file_obj = BytesIO(file_content)
        
        gcs_path, public_url = gcs_service.upload_file(
            file_obj=file_obj,
            user_id=str(current_user.id),
            trip_id=str(trip_uuid) if trip_uuid else "personal",
            filename=file.filename,
            content_type=file.content_type,
            variant="original"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload to GCS: {str(e)}"
        )
    
    # 3. Save metadata to database
    new_media = Media(
        user_id=current_user.id,
        trip_id=trip_uuid,
        gcs_path=gcs_path,
        public_url=public_url,
        filename=file.filename,
        mime_type=file.content_type,
        size_bytes=len(file_content),
        is_favorite=False
    )
    
    db.add(new_media)
    db.commit()
    db.refresh(new_media)
    
    # 4. Return response
    return PhotoResponse(
        id=new_media.id,
        trip_id=new_media.trip_id,
        uploader_id=new_media.user_id,
        public_url=new_media.public_url,
        thumbnail_url=new_media.thumbnail_url,
        filename=new_media.filename,
        media_type="video" if "video" in file.content_type else "image",
        mime_type=new_media.mime_type,
        size_bytes=new_media.size_bytes,
        is_favorite=new_media.is_favorite,
        created_at=new_media.created_at
    )


@router.get("/trip/{trip_id}", response_model=List[PhotoResponse])
def get_trip_media(
    trip_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all media for a specific trip."""
    # 1. Check Membership
    member = db.query(TripMember).filter(
        TripMember.trip_id == trip_id,
        TripMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this trip")

    # 2. Fetch Media
    media_list = db.query(Media).filter(
        Media.trip_id == trip_id
    ).order_by(Media.created_at.desc()).all()
    
    # 3. Convert to response format
    return [
        PhotoResponse(
            id=media.id,
            trip_id=media.trip_id,
            uploader_id=media.user_id,
            public_url=media.public_url,
            thumbnail_url=media.thumbnail_url,
            filename=media.filename,
            media_type="video" if "video" in media.mime_type else "image",
            mime_type=media.mime_type,
            size_bytes=media.size_bytes,
            is_favorite=media.is_favorite,
            created_at=media.created_at
        )
        for media in media_list
    ]


@router.patch("/{media_id}", response_model=PhotoResponse)
def update_media(
    media_id: UUID,
    update_data: MediaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update media metadata (e.g., toggle favorite)."""
    media = db.query(Media).filter(Media.id == media_id).first()
    
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    if media.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update fields
    if update_data.is_favorite is not None:
        media.is_favorite = update_data.is_favorite
    
    db.commit()
    db.refresh(media)
    
    return PhotoResponse(
        id=media.id,
        trip_id=media.trip_id,
        uploader_id=media.user_id,
        public_url=media.public_url,
        thumbnail_url=media.thumbnail_url,
        filename=media.filename,
        media_type="video" if "video" in media.mime_type else "image",
        mime_type=media.mime_type,
        size_bytes=media.size_bytes,
        is_favorite=media.is_favorite,
        created_at=media.created_at
    )


@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_media(
    media_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a media file from both GCS and database."""
    media = db.query(Media).filter(Media.id == media_id).first()
    
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    if media.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Delete from GCS
    gcs_service = get_gcs_service()
    gcs_service.delete_file(media.gcs_path)
    
    # Delete from database
    db.delete(media)
    db.commit()
    
    return


@router.get("/{media_id}/download")
def download_media(
    media_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    """
    Download a media file.
    
    This endpoint redirects to the GCS public URL with proper headers
    to force download with the original filename.
    """
    media = db.query(Media).filter(Media.id == media_id).first()
    
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    # Check if user has access (either owner or trip member)
    if media.user_id != current_user.id:
        # If not owner, check if user is a trip member
        if media.trip_id:
            member = db.query(TripMember).filter(
                TripMember.trip_id == media.trip_id,
                TripMember.user_id == current_user.id
            ).first()
            if not member:
                raise HTTPException(status_code=403, detail="Not authorized")
        else:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # For public bucket, we can redirect directly to the public URL
    # The browser will download the file with the original filename
    return RedirectResponse(
        url=media.public_url,
        status_code=302,
        headers={
            "Content-Disposition": f'attachment; filename="{media.filename}"'
        }
    )


@router.get("/trip/{trip_id}/download-all")
def download_trip_archive(
    trip_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download all media from a trip as a ZIP archive.
    
    Note: This is a placeholder for future implementation.
    For now, returns list of download URLs.
    """
    # Check membership
    member = db.query(TripMember).filter(
        TripMember.trip_id == trip_id,
        TripMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this trip")
    
    # Get all media
    media_list = db.query(Media).filter(
        Media.trip_id == trip_id
    ).all()
    
    # Return list of download URLs
    # TODO: Implement actual ZIP archive creation
    return {
        "trip_id": str(trip_id),
        "total_files": len(media_list),
        "download_urls": [
            {
                "id": str(media.id),
                "filename": media.filename,
                "url": media.public_url,
                "download_url": f"/media/{media.id}/download"
            }
            for media in media_list
        ],
        "note": "Use individual download URLs. Bulk ZIP download coming soon!"
    }
