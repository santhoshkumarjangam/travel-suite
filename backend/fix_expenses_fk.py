"""
Fix the expenses table foreign key constraint
This script drops the expenses table and recreates it with the correct foreign key
"""
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text
from app.database import engine, Base
from app.models.expense import Expense

print("Dropping expenses table...")
with engine.connect() as conn:
    conn.execute(text("DROP TABLE IF EXISTS expenses CASCADE"))
    conn.commit()

print("Recreating expenses table with correct foreign key...")
Expense.__table__.create(engine)

print("✅ Expenses table fixed!")
print("The foreign key now correctly references expense_trips table.")
