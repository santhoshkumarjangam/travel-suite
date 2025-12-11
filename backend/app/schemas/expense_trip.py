from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class ExpenseTripBase(BaseModel):
    name: str
    description: Optional[str] = None
    budget: Optional[float] = 0.0

class ExpenseTripCreate(ExpenseTripBase):
    pass

class MemberInfo(BaseModel):
    user_id: UUID
    name: str
    email: str
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True

class ExpenseTripResponse(ExpenseTripBase):
    id: UUID
    created_at: datetime
    created_by: UUID
    members: List[MemberInfo] = []

    class Config:
        from_attributes = True
