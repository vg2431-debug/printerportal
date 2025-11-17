import os
from dotenv import load_dotenv

load_dotenv()

# This is correct. It will be loaded from Render's environment variables.
MONGO_URI = os.getenv("MONGO_URI") 

# --- THIS IS THE FIX ---
# Set the default to match your actual database name.
DATABASE_NAME = os.getenv("DATABASE_NAME", "printerportal")