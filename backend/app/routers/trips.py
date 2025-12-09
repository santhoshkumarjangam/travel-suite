from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import random
import string
from ..database import get_db
from ..models.trip import Trip, TripMember
from ..models.user import User
from ..schemas.trip import TripCreate, TripResponse, TripJoin
from ..deps import get_current_user

router = APIRouter(prefix="/trips", tags=["Trips"])

def generate_join_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@router.get("/", response_model=List[TripResponse])
def get_my_trips(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Join TripMember to find trips for this user
    trips = db.query(Trip).join(TripMember).filter(TripMember.user_id == current_user.id).all()
    return trips

@router.post("/", response_model=TripResponse)
def create_trip(trip: TripCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Create Trip
    new_trip = Trip(
        name=trip.name,
        description=trip.description,
        cover_photo_url=trip.cover_photo_url,
        created_by=current_user.id,
        join_code=generate_join_code()
    )
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)

    # 2. Add Creator as Admin Member
    member = TripMember(
        trip_id=new_trip.id,
        user_id=current_user.id,
        role="admin"
    )
    db.add(member)
    db.commit()
    
    return new_trip

@router.post("/join", response_model=TripResponse)
def join_trip(join_data: TripJoin, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Find trip
    trip = db.query(Trip).filter(Trip.join_code == join_data.code.upper()).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Invalid join code")
    
    # Check if already member
    existing_member = db.query(TripMember).filter(
        TripMember.trip_id == trip.id, 
        TripMember.user_id == current_user.id
    ).first()
    
    if existing_member:
        return trip # Already joined, just return it
    
    # Add member
    new_member = TripMember(
        trip_id=trip.id,
        user_id=current_user.id,
        role="member"
    )
    db.add(new_member)
    db.commit()
    
    return trip

@router.get("/{trip_id}", response_model=TripResponse)
def get_trip_details(trip_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    # Verify membership
    member = db.query(TripMember).filter(
        TripMember.trip_id == trip.id, 
        TripMember.user_id == current_user.id
    ).first()
    
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this trip")
        
    return trip
