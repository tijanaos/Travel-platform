from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine
from app.router import router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Blog Service")

upload_path = Path(settings.upload_dir)
upload_path.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
app.include_router(router)
