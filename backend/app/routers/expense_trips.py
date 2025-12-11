from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from ..database import get_db
from ..models.expense_trip import ExpenseTrip, ExpenseTripMember
from ..models.user import User
from ..schemas.expense_trip import ExpenseTripCreate, ExpenseTripResponse
from ..deps import get_current_user

router = APIRouter(prefix="/expense-trips", tags=["expense-trips"])

@router.get("/")
def get_my_expense_trips(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all expense trips created by the current user"""
    # Get trips created by the user
    my_trips = db.query(ExpenseTrip).filter(
        ExpenseTrip.created_by == current_user.id
    ).options(
        joinedload(ExpenseTrip.members).joinedload(ExpenseTripMember.user)
    ).all()
    
    # Format response
    result = []
    for trip in my_trips:
        trip_dict = {
            "id": trip.id,
            "name": trip.name,
            "description": trip.description,
            "budget": trip.budget,
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
def create_expense_trip(trip: ExpenseTripCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new expense trip"""
    # Create trip
    new_trip = ExpenseTrip(
        name=trip.name,
        description=trip.description,
        budget=trip.budget,
        created_by=current_user.id
    )
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)

    # Add creator as admin member
    member = ExpenseTripMember(
        trip_id=new_trip.id,
        user_id=current_user.id,
        role="admin"
    )
    db.add(member)
    db.commit()
    
    # Reload trip with members
    trip_with_members = db.query(ExpenseTrip).options(
        joinedload(ExpenseTrip.members).joinedload(ExpenseTripMember.user)
    ).filter(ExpenseTrip.id == new_trip.id).first()
    
    # Format response
    return {
        "id": trip_with_members.id,
        "name": trip_with_members.name,
        "description": trip_with_members.description,
        "budget": trip_with_members.budget,
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

@router.get("/{trip_id}")
def get_expense_trip(trip_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get expense trip details"""
    trip = db.query(ExpenseTrip).options(
        joinedload(ExpenseTrip.members).joinedload(ExpenseTripMember.user)
    ).filter(ExpenseTrip.id == trip_id).first()
    
    if not trip:
        raise HTTPException(status_code=404, detail="Expense trip not found")
    
    # Check if user is the creator
    if trip.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="You don't have access to this trip")
    
    return {
        "id": trip.id,
        "name": trip.name,
        "description": trip.description,
        "budget": trip.budget,
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

@router.delete("/{trip_id}")
def delete_expense_trip(trip_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete an expense trip (admin only)"""
    trip = db.query(ExpenseTrip).filter(ExpenseTrip.id == trip_id).first()
    
    if not trip:
        raise HTTPException(status_code=404, detail="Expense trip not found")
    
    # Check if user is the creator
    if trip.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the trip creator can delete it")
    
    db.delete(trip)
    db.commit()
    
    return {"message": "Expense trip deleted successfully"}
