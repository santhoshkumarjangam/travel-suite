from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from ..database import get_db
from ..models.expense import Expense
from ..models.expense_trip import ExpenseTripMember
from ..models.user import User
from ..schemas.expense import ExpenseCreate, ExpenseResponse, ExpenseUpdate
from ..deps import get_current_user

router = APIRouter(prefix="/expenses", tags=["Expenses"])

@router.post("/", response_model=ExpenseResponse)
def create_expense(expense: ExpenseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Verify User is Member of Trip
    member = db.query(ExpenseTripMember).filter(
        ExpenseTripMember.trip_id == expense.trip_id,
        ExpenseTripMember.user_id == current_user.id
    ).first()
    
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this trip")

    # 2. Create Expense
    new_expense = Expense(
        trip_id=expense.trip_id,
        payer_id=current_user.id,
        amount=expense.amount,
        description=expense.description,
        currency=expense.currency,
        category=expense.category,
        date=expense.date,
        type=expense.type,
        split_details=expense.split_details
    )
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    
    return new_expense

@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(expense_id: UUID, expense_update: ExpenseUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    # Check permission (Payer only for now)
    if expense.payer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the payer can edit this expense")

    update_data = expense_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(expense, key, value)
        
    db.commit()
    db.refresh(expense)
    return expense

@router.get("/trip/{trip_id}", response_model=List[ExpenseResponse])
def get_trip_expenses(trip_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Verify User is Member
    member = db.query(ExpenseTripMember).filter(
        ExpenseTripMember.trip_id == trip_id,
        ExpenseTripMember.user_id == current_user.id
    ).first()
    
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this trip")

    # 2. Fetch Expenses
    expenses = db.query(Expense).filter(Expense.trip_id == trip_id).order_by(Expense.date.desc()).all()
    return expenses

@router.delete("/{expense_id}")
def delete_expense(expense_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    # Check permission (Only Payer or Admin?) - For now, allow payer.
    if expense.payer_id != current_user.id:
         # Check if trip admin? (Optimization: Check Member role)
         # For MVP, only payer can delete.
         raise HTTPException(status_code=403, detail="Only the payer can delete this expense")

    db.delete(expense)
    db.commit()
    
    return {"status": "deleted"}
