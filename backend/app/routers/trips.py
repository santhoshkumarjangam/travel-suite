from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
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
    from sqlalchemy.orm import joinedload
    
    # Join TripMember to find trips for this user, and load members with user details
    trips = db.query(Trip).options(
        joinedload(Trip.members).joinedload(TripMember.user)
    ).join(TripMember).filter(TripMember.user_id == current_user.id).all()
    
    # Format trips for response
    result = []
    for trip in trips:
        trip_dict = {
            "id": trip.id,
            "name": trip.name,
            "description": trip.description,
            "cover_photo_url": trip.cover_photo_url,
            "join_code": trip.join_code,
            "created_at": trip.created_at,
            "created_by": trip.created_by,
            "members": [
                {
                    "user_id": m.user_id,
                    "name": m.user.name,
                    "email": m.user.email,
                    "role": m.role,
                    "joined_at": m.joined_at
                }
                for m in trip.members
            ]
        }
        result.append(trip_dict)
    
    return result

@router.post("/")
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
    
    # 3. Reload trip with members and user data
    trip_with_members = db.query(Trip).options(
        joinedload(Trip.members).joinedload(TripMember.user)
    ).filter(Trip.id == new_trip.id).first()
    
    # 4. Format response manually
    return {
        "id": trip_with_members.id,
        "name": trip_with_members.name,
        "description": trip_with_members.description,
        "cover_photo_url": trip_with_members.cover_photo_url,
        "join_code": trip_with_members.join_code,
        "created_at": trip_with_members.created_at,
        "created_by": trip_with_members.created_by,
        "members": [
            {
                "user_id": m.user_id,
                "name": m.user.name,
                "email": m.user.email,
                "role": m.role,
                "joined_at": m.joined_at
            }
            for m in trip_with_members.members
        ]
    }

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
    
    if not existing_member:
        # Add member
        new_member = TripMember(
            trip_id=trip.id,
            user_id=current_user.id,
            role="member"
        )
        db.add(new_member)
        db.commit()
    
    # Reload trip with members and user data
    trip_with_members = db.query(Trip).options(
        joinedload(Trip.members).joinedload(TripMember.user)
    ).filter(Trip.id == trip.id).first()
    
    # Format response
    return {
        "id": trip_with_members.id,
        "name": trip_with_members.name,
        "description": trip_with_members.description,
        "cover_photo_url": trip_with_members.cover_photo_url,
        "join_code": trip_with_members.join_code,
        "created_at": trip_with_members.created_at,
        "created_by": trip_with_members.created_by,
        "members": [
            {
                "user_id": m.user_id,
                "name": m.user.name,
                "email": m.user.email,
                "role": m.role,
                "joined_at": m.joined_at
            }
            for m in trip_with_members.members
        ]
    }

@router.get("/{trip_id}", response_model=TripResponse)
def get_trip_details(trip_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from sqlalchemy.orm import joinedload
    
    trip = db.query(Trip).options(
        joinedload(Trip.members).joinedload(TripMember.user)
    ).filter(Trip.id == trip_id).first()
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    # Verify membership
    member = db.query(TripMember).filter(
        TripMember.trip_id == trip.id, 
        TripMember.user_id == current_user.id
    ).first()
    
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this trip")
    
    # Format members for response
    trip_dict = {
        "id": trip.id,
        "name": trip.name,
        "description": trip.description,
        "cover_photo_url": trip.cover_photo_url,
        "join_code": trip.join_code,
        "created_at": trip.created_at,
        "created_by": trip.created_by,
        "members": [
            {
                "user_id": m.user_id,
                "name": m.user.name,
                "email": m.user.email,
                "role": m.role,
                "joined_at": m.joined_at
            }
            for m in trip.members
        ]
    }
        
    return trip_dict

@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(trip_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    # Only creator can delete
    if str(trip.created_by) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this trip")
        
    db.delete(trip)
    db.commit()
    return
