from app.database import SessionLocal
from app.models.user import User

db = SessionLocal()
user = db.query(User).filter(User.email == "santhosh@gmail.com").first()

if user:
    print(f"User FOUND: ID={user.id}, Name={user.name}, Email={user.email}")
else:
    print("User NOT FOUND")

db.close()
