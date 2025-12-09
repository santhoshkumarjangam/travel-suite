from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

try:
    hash = pwd_context.hash("sssssss")
    print(f"Hash success: {hash}")
    print(f"Verify: {pwd_context.verify('sssssss', hash)}")
except Exception as e:
    print(f"Hash failed: {e}")
