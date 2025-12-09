from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class TripBase(BaseModel):
    name: str
    description: Optional[str] = None
    cover_photo_url: Optional[str] = None

class TripCreate(TripBase):
    pass

class TripJoin(BaseModel):
    code: str

class TripResponse(TripBase):
    id: UUID
    join_code: Optional[str]
    created_at: datetime
    # member_count: int # Can add this later

    class Config:
        from_attributes = True
