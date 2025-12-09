from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal
from app.models.user import User
from app.utils.security import get_password_hash

db = SessionLocal()
user = db.query(User).filter(User.email == "santhosh@gmail.com").first()

if user:
    print(f"Resetting password for {user.email}...")
    new_hash = get_password_hash("sssssss")
    user.password_hash = new_hash
    db.commit()
    print("Password Reset Successfully to 'sssssss'")
else:
    print("User NOT FOUND")

db.close()
