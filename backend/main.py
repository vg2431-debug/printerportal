from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import motor.motor_asyncio
from backend.utils.db import MONGO_URI, DATABASE_NAME
import logging

# Import your routers
from backend.routers import printers, auth, jobs, settings, inventory
from backend.routers import ink_fills  # <-- 1. IMPORT THE NEW ROUTER

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Web-Based Intelligent Printer Log Monitoring and Analytics Portal")

# --- Database Connection ---
@app.on_event("startup")
async def startup_db_client():
    app.mongodb_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
    app.db = app.mongodb_client[DATABASE_NAME]
    logger.info("Successfully connected to MongoDB!")

@app.on_event("shutdown")
async def shutdown_db_client():
    app.mongodb_client.close()
    logger.info("MongoDB connection closed.")

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # React default
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Include Routers ---
app.include_router(auth.router)
app.include_router(printers.router)
app.include_router(jobs.router)
app.include_router(settings.router)
app.include_router(inventory.router)
app.include_router(ink_fills.router)  # <-- 2. ADD THE NEW ROUTER

# --- Root Endpoint ---
@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to the Printer Log Monitoring API!"}