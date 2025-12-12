from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, trips, expenses, media, users, expense_trips, itinerary

# Import all models so they're registered with Base
from .models.user import User
from .models.trip import Trip
from .models.expense import Expense
from .models.media import Media
from .models.itinerary_trip import ItineraryTrip, ItineraryTripMember
from .models.itinerary_day import ItineraryDay
from .models.itinerary_activity import ItineraryActivity
from .models.itinerary_packing import ItineraryPackingList

# Auto-create tables (Dev only)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Economiq, Galleriq & Tripify API")

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
app.include_router(itinerary.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
