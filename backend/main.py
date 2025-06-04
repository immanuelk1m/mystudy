from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv # Added for .env loading
# Load environment variables from .env file FIRST
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles # Added for static files
import os # Added for path joining

from .routers import notebooks # Use relative import for routers sub-package
from .routers import batch_processing # Add import for the new batch processing router

app = FastAPI(
    title="Study Platform API",
    description="API for the study platform, providing data for notebooks, chapters, content, and structure.",
    version="0.1.0",
)

# Configure CORS
# Adjust origins as necessary for your frontend development server
origins = [
    "http://localhost",         # Common default for local dev
    "http://localhost:3000",    # Default for create-react-app
    "http://localhost:5173",    # Default for Vite
    "http://localhost:8080",    # Current frontend dev server port
    # Add other origins if your frontend runs on a different port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Allows specific origins
    allow_credentials=True,
    allow_methods=["*"],         # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],         # Allows all headers
)

# Mount static files directory for uploads
# This will serve files from backend/static under the /static URL path
static_dir = os.path.join(os.path.dirname(__file__), "static")
# Ensure the 'static' directory and 'static/uploads' subdirectory exist
if not os.path.exists(static_dir):
    os.makedirs(static_dir)
if not os.path.exists(os.path.join(static_dir, "uploads")):
    os.makedirs(os.path.join(static_dir, "uploads")) # We created this with run_command, but good to have for robustness

app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Include routers
app.include_router(notebooks.router)
app.include_router(batch_processing.router) # Include the new batch processing router

@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to the Study Platform API! Visit /docs for API documentation."}

# To run the server (for development):
# uvicorn backend.main:app --reload --port 8000
# (Assuming 'backend' is the directory containing main.py and it's in PYTHONPATH or you run from parent dir)
# Or, if you are in the 'backend' directory:
# uvicorn main:app --reload --port 8000
