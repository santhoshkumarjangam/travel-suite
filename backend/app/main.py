from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, trips, expenses, media, users, expense_trips

# Auto-create tables (Dev only)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Economiq & Galleriq API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # TODO: Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(trips.router)
app.include_router(expense_trips.router)
app.include_router(expenses.router)
app.include_router(media.router)
app.include_router(users.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
