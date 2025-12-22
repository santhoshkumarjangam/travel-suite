from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import RedirectResponse, StreamingResponse, StreamingResponse
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from ..database import get_db
from ..models.media import Media
from ..models.trip import Trip, TripMember
from ..models.user import User
from ..schemas.media import UploadRequest, UploadResponse, PhotoResponse, MediaUpdate, PaginatedPhotoResponse
from ..deps import get_current_user, get_current_user_optional
from ..services.gcs import get_gcs_service

router = APIRouter(prefix="/media", tags=["Media"])


@router.post("/upload", response_model=PhotoResponse)
async def upload_media(
    file: UploadFile = File(...),
    trip_id: str = Form(...),
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
    
    # Auto-set cover photo if not set
    if trip_uuid and new_media.public_url:
        trip = db.query(Trip).filter(Trip.id == trip_uuid).first()
        if trip and not trip.cover_photo_url:
            trip.cover_photo_url = new_media.public_url
            db.commit()
    
    # 4. Return response
    return PhotoResponse(
        id=new_media.id,
        trip_id=new_media.trip_id,
        uploader_id=new_media.user_id,
        uploader_name=current_user.name,
        public_url=new_media.public_url,
        thumbnail_url=new_media.thumbnail_url,
        filename=new_media.filename,
        media_type="video" if "video" in file.content_type else "image",
        mime_type=new_media.mime_type,
        size_bytes=new_media.size_bytes,
        is_favorite=new_media.is_favorite,
        created_at=new_media.created_at
    )


@router.get("/trip/{trip_id}", response_model=PaginatedPhotoResponse)
def get_trip_media(
    trip_id: UUID,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all media for a specific trip (Paginated)."""
    # 1. Check Membership
    member = db.query(TripMember).filter(
        TripMember.trip_id == trip_id,
        TripMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this trip")

    # 2. Build Query
    query = db.query(Media, User.name.label("uploader_name")).join(User, Media.user_id == User.id).filter(
        Media.trip_id == trip_id
    )
    
    # 3. Pagination
    total_items = query.count()
    total_pages = (total_items + limit - 1) // limit
    
    media_list = query.order_by(Media.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    # 4. Map Response
    items = [
        PhotoResponse(
            id=media.id,
            trip_id=media.trip_id,
            uploader_id=media.user_id,
            uploader_name=uploader_name if uploader_name else "Unknown",
            public_url=media.public_url,
            thumbnail_url=media.thumbnail_url,
            filename=media.filename,
            media_type="video" if "video" in media.mime_type else "image",
            mime_type=media.mime_type,
            size_bytes=media.size_bytes,
            is_favorite=media.is_favorite,
            created_at=media.created_at
        )
        for media, uploader_name in media_list
    ]
    
    return PaginatedPhotoResponse(
        items=items,
        total=total_items,
        page=page,
        size=limit,
        pages=total_pages
    )


@router.get("/favorites", response_model=PaginatedPhotoResponse)
def get_user_favorites(
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's favorite media across all trips."""
    
    query = db.query(Media, User.name.label("uploader_name")).join(User, Media.user_id == User.id).filter(
        Media.is_favorite == True
    )
    
    # We should ensure user can only see favorites from trips they are in OR their own uploads?
    # Logic: Favorites are personal. Usually means "I liked this". 
    # But usually one only sees media they have access to. 
    # Since checking membership for EVERY trip in a single query is complex, 
    # we'll assume for now: Favorites = Media marked favorite by ANYONE? 
    # Wait, 'is_favorite' is on the Media object. So it's "Global Favorite" status? 
    # Or is it "My Favorite"? 
    # If Media.is_favorite is a boolean on the Media table, then it's a global property (e.g. "Featured").
    # If we want per-user favorites, we need a many-to-many table. 
    # checking PhotoContext.jsx: toggleFavorite toggles Media.is_favorite. 
    # SO it is GLOBAL. OK. 
    # Then we just return all media marked is_favorite that the user has access to.
    # User has access to: 1. Their own media (always?) 2. Media in trips they are member of.
    
    # Filter by user's trips
    user_trip_ids = db.query(TripMember.trip_id).filter(TripMember.user_id == current_user.id).subquery()
    
    query = query.filter(
        # Media belongs to a trip the user is in
        Media.trip_id.in_(user_trip_ids)
    )

    total_items = query.count()
    total_pages = (total_items + limit - 1) // limit
    
    media_list = query.order_by(Media.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    items = [
        PhotoResponse(
            id=media.id,
            trip_id=media.trip_id,
            uploader_id=media.user_id,
            uploader_name=uploader_name if uploader_name else "Unknown",
            public_url=media.public_url,
            thumbnail_url=media.thumbnail_url,
            filename=media.filename,
            media_type="video" if "video" in media.mime_type else "image",
            mime_type=media.mime_type,
            size_bytes=media.size_bytes,
            is_favorite=media.is_favorite,
            created_at=media.created_at
        )
        for media, uploader_name in media_list
    ]
    
    return PaginatedPhotoResponse(
        items=items,
        total=total_items,
        page=page,
        size=limit,
        pages=total_pages
    )


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
    
    # Check access: Owner OR Member of the trip
    if media.user_id != current_user.id:
        # If not owner, check if user is a trip member
        is_member = False
        if media.trip_id:
            member = db.query(TripMember).filter(
                TripMember.trip_id == media.trip_id,
                TripMember.user_id == current_user.id
            ).first()
            if member:
                is_member = True
        
        if not is_member:
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
    # Check if this was the cover photo
    if media.trip_id:
        trip = db.query(Trip).filter(Trip.id == media.trip_id).first()
        if trip and trip.cover_photo_url == media.public_url:
            # Find a replacement (latest photo)
            latest_media = db.query(Media).filter(
                Media.trip_id == media.trip_id,
                Media.id != media.id
            ).order_by(Media.created_at.desc()).first()
            
            if latest_media:
                trip.cover_photo_url = latest_media.public_url
            else:
                trip.cover_photo_url = None
            db.add(trip) # Ensure trip update is staged

    db.delete(media)
    db.commit()
    
    return


@router.get("/{media_id}/download")
def download_media(
    media_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download a media file via backend proxy (avoids CORS)."""
    media = db.query(Media).filter(Media.id == media_id).first()
    
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    # Check access: Owner OR Member of the trip
    has_access = False
    if media.user_id == current_user.id:
        has_access = True
    elif media.trip_id:
        # Check if user is a member of the trip
        membership = db.query(TripMember).filter(
            TripMember.trip_id == media.trip_id,
            TripMember.user_id == current_user.id
        ).first()
        if membership:
            has_access = True
            
    if not has_access:
        raise HTTPException(status_code=403, detail="Not authorized to access this file")

    gcs_service = get_gcs_service()
    try:
        file_stream = gcs_service.get_file_stream(media.gcs_path)
        
        # Determine strict filename
        # Ensure ascii filename to prevent header injection issues, though FastAPI handles some
        safe_filename = media.filename.encode('ascii', 'ignore').decode('ascii') or "download"
        
        headers = {
            'Content-Disposition': f'attachment; filename="{safe_filename}"'
        }
        
        return StreamingResponse(
            file_stream, 
            media_type=media.mime_type, 
            headers=headers
        )
    except Exception as e:
        print(f"Download failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to stream file")


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
