from datetime import datetime, timedelta
from jose import jwt
from typing import Optional
import os
import bcrypt

# Secret key (should be in env vars)
SECRET_KEY = os.getenv("SECRET_KEY", "fallback_unsafe_secret_key_change_me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60 # 30 Days

# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# REFACTOR: Using bcrypt directly to avoid passlib limitation on Windows

def verify_password(plain_password, hashed_password):
    # return pwd_context.verify(plain_password, hashed_password)
    # Ensure bytes for bcrypt
    if isinstance(plain_password, str):
        plain_password = plain_password.encode('utf-8')
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')
        
    return bcrypt.checkpw(plain_password, hashed_password)

def get_password_hash(password):
    # return pwd_context.hash(password)
    if isinstance(password, str):
        password = password.encode('utf-8')
        
    # Generate salt and hash
    hashed = bcrypt.hashpw(password, bcrypt.gensalt())
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
