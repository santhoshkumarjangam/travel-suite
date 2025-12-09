from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID

class UserBase(BaseModel):
    name: str
    email: EmailStr

class UserUpdate(BaseModel):
    name: Optional[str] = None
    profile_pic_url: Optional[str] = None
    # Email update typically requires re-verification code, skipping for MVP
    # Password update should be a separate secure endpoint

class UserResponse(UserBase):
    id: UUID
    profile_pic_url: Optional[str] = None

    class Config:
        from_attributes = True
