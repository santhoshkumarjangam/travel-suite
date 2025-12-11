"""
Reset database schema
Run this script to drop all tables and recreate them with the updated schema.
"""
from dotenv import load_dotenv
load_dotenv()

from app.database import Base, engine

print("Dropping all tables...")
Base.metadata.drop_all(bind=engine)

print("Creating all tables with new schema...")
Base.metadata.create_all(bind=engine)

print("✅ Database schema reset complete!")
print("Note: All existing data has been deleted.")
