from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal
from app.models.user import User
from app.utils.security import get_password_hash

db = SessionLocal()
email = "santhosh@gmail.com"
existing = db.query(User).filter(User.email == email).first()

if existing:
    print(f"User {email} already exists.")
else:
    print(f"Creating user {email}...")
    new_user = User(
        email=email,
        password_hash=get_password_hash("sssssss"),
        name="Santhosh"
    )
    db.add(new_user)
    db.commit()
    print(f"User {email} created successfully!")

db.close()
