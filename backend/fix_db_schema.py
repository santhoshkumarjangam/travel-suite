"""
Check database tables and fix foreign key constraint
"""
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text, inspect
from app.database import engine

print("Checking existing tables...")
inspector = inspect(engine)
tables = inspector.get_table_names()
print(f"Tables: {tables}")

print("\nDropping expenses table if it exists...")
with engine.connect() as conn:
    conn.execute(text("DROP TABLE IF EXISTS expenses CASCADE"))
    conn.commit()
    print("✅ Expenses table dropped")

print("\nRecreating all tables...")
from app.database import Base
Base.metadata.create_all(bind=engine)
print("✅ All tables created with correct schema")

print("\nVerifying tables...")
inspector = inspect(engine)
tables = inspector.get_table_names()
print(f"Tables now: {tables}")
