from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import close_db, init_db
from app.grpc_server import serve as start_grpc
from app.router import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    grpc_server = await start_grpc(settings.grpc_port)
    yield
    close_db()
    await grpc_server.stop(0)


app = FastAPI(title="Blog Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

upload_path = Path(settings.upload_dir)
upload_path.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
app.include_router(router)
