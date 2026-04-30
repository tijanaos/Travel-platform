from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

_client: AsyncIOMotorClient | None = None


def init_db() -> None:
    global _client
    _client = AsyncIOMotorClient(settings.mongo_uri)


def close_db() -> None:
    if _client:
        _client.close()


def get_db() -> AsyncIOMotorDatabase:
    return _client[settings.mongo_db]
