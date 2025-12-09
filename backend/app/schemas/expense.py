from pydantic import BaseModel, condecimal, Field
from typing import Optional, Any
from uuid import UUID
from datetime import datetime

class ExpenseBase(BaseModel):
    description: str
    amount: float
    currency: str = "USD"
    category: Optional[str] = "General"
    date: datetime = Field(default_factory=datetime.now)
    type: str = "expense" # expense, income, settled
    split_details: Optional[Any] = None # JSON blob for now

class ExpenseCreate(ExpenseBase):
    trip_id: UUID

class ExpenseUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    category: Optional[str] = None
    date: Optional[datetime] = None
    type: Optional[str] = None
    split_details: Optional[Any] = None

class ExpenseResponse(ExpenseBase):
    id: UUID
    trip_id: UUID
    payer_id: UUID
    # payer_name? (can join later)

    class Config:
        from_attributes = True
