from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import notebooks, batch_processing

Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notebooks.router, prefix="/api/notebooks", tags=["notebooks"])
app.include_router(batch_processing.router, prefix="/api/batch-process-pdfs", tags=["batch-processing"])
