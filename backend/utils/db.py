# This file can be left as is for now, but the connection will be managed in main.py
# Or, to simplify, you can just have the MONGO_URI and DATABASE_NAME constants here.

import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017") # Default MongoDB port is 27017
DATABASE_NAME = "printer_portal"