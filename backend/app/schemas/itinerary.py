"""Pydantic schemas for itinerary API."""

from pydantic import BaseModel, UUID4
from datetime import date, time, datetime
from typing import Optional, List
from decimal import Decimal


# Trip Schemas
class ItineraryTripBase(BaseModel):
    name: str
    destination: Optional[str] = None
    start_date: str  # Accept as string, will be converted to date
    end_date: str    # Accept as string, will be converted to date
    description: Optional[str] = None
    cover_image_url: Optional[str] = None


class ItineraryTripCreate(ItineraryTripBase):
    pass


class ItineraryTripUpdate(BaseModel):
    name: Optional[str] = None
    destination: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    cover_image_url: Optional[str] = None


class ItineraryTripMemberResponse(BaseModel):
    user_id: UUID4
    role: str
    joined_at: datetime
    
    class Config:
        from_attributes = True


class ItineraryTripResponse(BaseModel):
    id: UUID4
    name: str
    destination: Optional[str] = None
    start_date: date  # Override to return as date object
    end_date: date    # Override to return as date object
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    join_code: str
    created_by: UUID4
    created_at: datetime
    updated_at: datetime
    members: List[ItineraryTripMemberResponse] = []
    
    class Config:
        from_attributes = True


# Day Schemas
class ItineraryDayBase(BaseModel):
    day_number: int
    date: date
    title: Optional[str] = None
    notes: Optional[str] = None


class ItineraryDayCreate(ItineraryDayBase):
    pass


class ItineraryDayUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None


class ItineraryDayResponse(ItineraryDayBase):
    id: UUID4
    trip_id: UUID4
    created_at: datetime
    
    class Config:
        from_attributes = True


# Activity Schemas
class ItineraryActivityBase(BaseModel):
    title: str
    description: Optional[str] = None
    activity_type: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    duration: Optional[int] = None
    location: Optional[str] = None
    location_lat: Optional[Decimal] = None
    location_lng: Optional[Decimal] = None
    maps_link: Optional[str] = None
    cost: Optional[Decimal] = None
    currency: str = 'USD'
    booking_url: Optional[str] = None
    notes: Optional[str] = None
    image_url: Optional[str] = None
    assigned_to: Optional[UUID4] = None
    is_completed: bool = False


class ItineraryActivityCreate(ItineraryActivityBase):
    order_index: int


class ItineraryActivityUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    activity_type: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    duration: Optional[int] = None
    location: Optional[str] = None
    location_lat: Optional[Decimal] = None
    location_lng: Optional[Decimal] = None
    maps_link: Optional[str] = None
    cost: Optional[Decimal] = None
    currency: Optional[str] = None
    booking_url: Optional[str] = None
    notes: Optional[str] = None
    image_url: Optional[str] = None
    assigned_to: Optional[UUID4] = None
    is_completed: Optional[bool] = None
    order_index: Optional[int] = None


class ItineraryActivityResponse(ItineraryActivityBase):
    id: UUID4
    day_id: UUID4
    order_index: int
    created_by: Optional[UUID4]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Packing List Schemas
class ItineraryPackingItemBase(BaseModel):
    item: str
    category: Optional[str] = None
    quantity: int = 1
    notes: Optional[str] = None


class ItineraryPackingItemCreate(ItineraryPackingItemBase):
    pass


class ItineraryPackingItemUpdate(BaseModel):
    item: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = None
    notes: Optional[str] = None
    is_packed: Optional[bool] = None


class ItineraryPackingItemResponse(ItineraryPackingItemBase):
    id: UUID4
    trip_id: UUID4
    is_packed: bool
    added_by: Optional[UUID4]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Join Trip Schema
class JoinTripRequest(BaseModel):
    join_code: str
