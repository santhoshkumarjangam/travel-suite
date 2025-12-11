from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..schemas.user import UserResponse, UserUpdate
from ..deps import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
def read_users_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Auto-heal: If name is missing/empty, default to email prefix
    # Auto-heal: If name is missing/empty, default to email prefix
    # Auto-heal: If name is missing/empty, default to email prefix
    if not current_user.name or not current_user.name.strip():
        current_user.name = current_user.email.split('@')[0]
    return current_user

@router.put("/me", response_model=UserResponse)
def update_user_me(user_update: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    
    # Update allowed fields
    update_data = user_update.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(current_user, key, value)
    
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # TODO: Add logic to cleanup resources (photos in GCS, cascade delete trips?)
    # For MVP: PostgreSQL Cascade should handle DB relations, GCS might be orphaned.
    db.delete(current_user)
    db.commit()
    return
