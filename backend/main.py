from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import cloudinary
import cloudinary.uploader
import os
from dotenv import load_dotenv

load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

from routes import auth, listings, offers, user, admin, watchlist, chat 
from routes import transactions, reviews, reports, reputation, notifications

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://bazaar-iitgn-fpjg.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(listings.router)
app.include_router(offers.router)
app.include_router(user.router)
app.include_router(admin.router)
app.include_router(watchlist.router)
app.include_router(chat.router)
app.include_router(transactions.router)
app.include_router(reviews.router)
app.include_router(reports.router)
app.include_router(reputation.router)
app.include_router(notifications.router)