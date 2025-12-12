"""Itinerary API router for Tripify app."""

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from ..database import get_db
from ..models.itinerary_trip import ItineraryTrip, ItineraryTripMember
from ..models.itinerary_day import ItineraryDay
from ..models.itinerary_activity import ItineraryActivity
from ..models.itinerary_packing import ItineraryPackingList
from ..models.user import User
from ..schemas.itinerary import (
    ItineraryTripCreate, ItineraryTripUpdate, ItineraryTripResponse,
    ItineraryDayCreate, ItineraryDayUpdate, ItineraryDayResponse,
    ItineraryActivityCreate, ItineraryActivityUpdate, ItineraryActivityResponse,
    ItineraryPackingItemCreate, ItineraryPackingItemUpdate, ItineraryPackingItemResponse,
    JoinTripRequest
)
from ..deps import get_current_user

router = APIRouter(prefix="/itinerary", tags=["Itinerary"])


# Helper function to check trip access
def check_trip_access(trip_id: UUID, user_id: UUID, db: Session, required_role: str = None):
    """Check if user has access to trip."""
    member = db.query(ItineraryTripMember).filter(
        ItineraryTripMember.trip_id == trip_id,
        ItineraryTripMember.user_id == user_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this trip")
    
    if required_role and member.role not in ['owner', required_role]:
        if required_role == 'editor' and member.role == 'viewer':
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    return member


# ==================== TRIP ENDPOINTS ====================

@router.post("/trips", response_model=ItineraryTripResponse, status_code=status.HTTP_201_CREATED)
def create_trip(
    trip_data: ItineraryTripCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new itinerary trip."""
    from datetime import datetime
    
    # Convert string dates to date objects (accept both / and - formats)
    trip_dict = trip_data.dict()
    
    # Replace slashes with dashes if present
    start_date_str = trip_dict['start_date'].replace('/', '-')
    end_date_str = trip_dict['end_date'].replace('/', '-')
    
    trip_dict['start_date'] = datetime.strptime(start_date_str, '%Y-%m-%d').date()
    trip_dict['end_date'] = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    
    new_trip = ItineraryTrip(
        **trip_dict,
        created_by=current_user.id
    )
    db.add(new_trip)
    db.flush()
    
    # Add creator as owner
    owner_member = ItineraryTripMember(
        trip_id=new_trip.id,
        user_id=current_user.id,
        role='owner'
    )
    db.add(owner_member)
    db.commit()
    db.refresh(new_trip)
    
    return new_trip


@router.get("/trips", response_model=List[ItineraryTripResponse])
def get_user_trips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all trips user is a member of."""
    memberships = db.query(ItineraryTripMember).filter(
        ItineraryTripMember.user_id == current_user.id
    ).all()
    
    trip_ids = [m.trip_id for m in memberships]
    trips = db.query(ItineraryTrip).filter(ItineraryTrip.id.in_(trip_ids)).all()
    
    return trips


@router.get("/trips/{trip_id}", response_model=ItineraryTripResponse)
def get_trip(
    trip_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get trip details."""
    check_trip_access(trip_id, current_user.id, db)
    
    trip = db.query(ItineraryTrip).filter(ItineraryTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    return trip


@router.put("/trips/{trip_id}", response_model=ItineraryTripResponse)
def update_trip(
    trip_id: UUID,
    trip_data: ItineraryTripUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update trip details."""
    check_trip_access(trip_id, current_user.id, db, required_role='editor')
    
    trip = db.query(ItineraryTrip).filter(ItineraryTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    for key, value in trip_data.dict(exclude_unset=True).items():
        setattr(trip, key, value)
    
    db.commit()
    db.refresh(trip)
    return trip


@router.delete("/trips/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(
    trip_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete trip (owner only)."""
    member = check_trip_access(trip_id, current_user.id, db)
    
    if member.role != 'owner':
        raise HTTPException(status_code=403, detail="Only owner can delete trip")
    
    trip = db.query(ItineraryTrip).filter(ItineraryTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    db.delete(trip)
    db.commit()


@router.post("/trips/join", response_model=ItineraryTripResponse)
def join_trip(
    join_request: JoinTripRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Join a trip using join code."""
    trip = db.query(ItineraryTrip).filter(
        ItineraryTrip.join_code == join_request.join_code.upper()
    ).first()
    
    if not trip:
        raise HTTPException(status_code=404, detail="Invalid join code")
    
    # Check if already a member
    existing = db.query(ItineraryTripMember).filter(
        ItineraryTripMember.trip_id == trip.id,
        ItineraryTripMember.user_id == current_user.id
    ).first()
    
    if existing:
        return trip
    
    # Add as editor
    new_member = ItineraryTripMember(
        trip_id=trip.id,
        user_id=current_user.id,
        role='editor'
    )
    db.add(new_member)
    db.commit()
    db.refresh(trip)
    
    return trip


# ==================== DAY ENDPOINTS ====================

@router.post("/trips/{trip_id}/days", response_model=ItineraryDayResponse, status_code=status.HTTP_201_CREATED)
def create_day(
    trip_id: UUID,
    day_data: ItineraryDayCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a day to trip itinerary."""
    check_trip_access(trip_id, current_user.id, db, required_role='editor')
    
    new_day = ItineraryDay(
        trip_id=trip_id,
        **day_data.dict()
    )
    db.add(new_day)
    db.commit()
    db.refresh(new_day)
    
    return new_day


@router.get("/trips/{trip_id}/days", response_model=List[ItineraryDayResponse])
def get_trip_days(
    trip_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all days for a trip."""
    check_trip_access(trip_id, current_user.id, db)
    
    days = db.query(ItineraryDay).filter(
        ItineraryDay.trip_id == trip_id
    ).order_by(ItineraryDay.day_number).all()
    
    return days


@router.put("/days/{day_id}", response_model=ItineraryDayResponse)
def update_day(
    day_id: UUID,
    day_data: ItineraryDayUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update day details."""
    day = db.query(ItineraryDay).filter(ItineraryDay.id == day_id).first()
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")
    
    check_trip_access(day.trip_id, current_user.id, db, required_role='editor')
    
    for key, value in day_data.dict(exclude_unset=True).items():
        setattr(day, key, value)
    
    db.commit()
    db.refresh(day)
    return day


@router.delete("/days/{day_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_day(
    day_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a day."""
    day = db.query(ItineraryDay).filter(ItineraryDay.id == day_id).first()
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")
    
    check_trip_access(day.trip_id, current_user.id, db, required_role='editor')
    
    db.delete(day)
    db.commit()


# ==================== ACTIVITY ENDPOINTS ====================

@router.post("/days/{day_id}/activities", response_model=ItineraryActivityResponse, status_code=status.HTTP_201_CREATED)
def create_activity(
    day_id: UUID,
    activity_data: ItineraryActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add activity to a day."""
    day = db.query(ItineraryDay).filter(ItineraryDay.id == day_id).first()
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")
    
    check_trip_access(day.trip_id, current_user.id, db, required_role='editor')
    
    new_activity = ItineraryActivity(
        day_id=day_id,
        created_by=current_user.id,
        **activity_data.dict()
    )
    db.add(new_activity)
    db.commit()
    db.refresh(new_activity)
    
    return new_activity


@router.get("/days/{day_id}/activities", response_model=List[ItineraryActivityResponse])
def get_day_activities(
    day_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all activities for a day."""
    day = db.query(ItineraryDay).filter(ItineraryDay.id == day_id).first()
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")
    
    check_trip_access(day.trip_id, current_user.id, db)
    
    activities = db.query(ItineraryActivity).filter(
        ItineraryActivity.day_id == day_id
    ).order_by(ItineraryActivity.order_index).all()
    
    return activities


@router.put("/activities/{activity_id}", response_model=ItineraryActivityResponse)
def update_activity(
    activity_id: UUID,
    activity_data: ItineraryActivityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update activity details."""
    activity = db.query(ItineraryActivity).filter(ItineraryActivity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    day = db.query(ItineraryDay).filter(ItineraryDay.id == activity.day_id).first()
    check_trip_access(day.trip_id, current_user.id, db, required_role='editor')
    
    for key, value in activity_data.dict(exclude_unset=True).items():
        setattr(activity, key, value)
    
    db.commit()
    db.refresh(activity)
    return activity


@router.delete("/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(
    activity_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an activity."""
    activity = db.query(ItineraryActivity).filter(ItineraryActivity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    day = db.query(ItineraryDay).filter(ItineraryDay.id == activity.day_id).first()
    check_trip_access(day.trip_id, current_user.id, db, required_role='editor')
    
    # Delete photo from GCS if exists
    if activity.image_url:
        try:
            from ..services.gcs import GCSService
            gcs_service = GCSService()
            # Extract path from URL
            if 'storage.googleapis.com' in activity.image_url:
                path = activity.image_url.split('/')[-1]
                gcs_service.delete_file(path)
        except Exception as e:
            print(f"Failed to delete activity photo: {e}")
    
    db.delete(activity)
    db.commit()


@router.post("/activities/{activity_id}/upload-photo")
async def upload_activity_photo(
    activity_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload photo for an activity."""
    from ..services.gcs import GCSService
    import uuid as uuid_lib
    
    # Get activity and check access
    activity = db.query(ItineraryActivity).filter(ItineraryActivity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    day = db.query(ItineraryDay).filter(ItineraryDay.id == activity.day_id).first()
    check_trip_access(day.trip_id, current_user.id, db, required_role='editor')
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are allowed")
    
    # Delete old photo if exists
    if activity.image_url:
        try:
            gcs_service = GCSService()
            if 'storage.googleapis.com' in activity.image_url:
                path = activity.image_url.split('/')[-1]
                gcs_service.delete_file(path)
        except Exception as e:
            print(f"Failed to delete old photo: {e}")
    
    # Upload new photo
    try:
        gcs_service = GCSService()
        file_extension = file.filename.split('.')[-1]
        unique_filename = f"activity_{activity_id}_{uuid_lib.uuid4()}.{file_extension}"
        gcs_path = f"users/user_{current_user.id}/activities/{unique_filename}"
        
        file_content = await file.read()
        public_url = gcs_service.upload_file(
            file_content=file_content,
            destination_path=gcs_path,
            content_type=file.content_type
        )
        
        # Update activity with photo URL
        activity.image_url = public_url
        db.commit()
        db.refresh(activity)
        
        return {"image_url": public_url}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload photo: {str(e)}")


# ==================== PACKING LIST ENDPOINTS ====================

@router.post("/trips/{trip_id}/packing", response_model=ItineraryPackingItemResponse, status_code=status.HTTP_201_CREATED)
def create_packing_item(
    trip_id: UUID,
    item_data: ItineraryPackingItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add item to packing list."""
    check_trip_access(trip_id, current_user.id, db, required_role='editor')
    
    new_item = ItineraryPackingList(
        trip_id=trip_id,
        added_by=current_user.id,
        **item_data.dict()
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    return new_item


@router.get("/trips/{trip_id}/packing", response_model=List[ItineraryPackingItemResponse])
def get_packing_list(
    trip_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get packing list for trip."""
    check_trip_access(trip_id, current_user.id, db)
    
    items = db.query(ItineraryPackingList).filter(
        ItineraryPackingList.trip_id == trip_id
    ).all()
    
    return items


@router.patch("/packing/{item_id}/toggle", response_model=ItineraryPackingItemResponse)
def toggle_packed(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle packed status of item."""
    item = db.query(ItineraryPackingList).filter(ItineraryPackingList.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    check_trip_access(item.trip_id, current_user.id, db)
    
    item.is_packed = not item.is_packed
    db.commit()
    db.refresh(item)
    
    return item


@router.delete("/packing/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_packing_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete packing item."""
    item = db.query(ItineraryPackingList).filter(ItineraryPackingList.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    check_trip_access(item.trip_id, current_user.id, db, required_role='editor')
    
    db.delete(item)
    db.commit()
