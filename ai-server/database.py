from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from core.config import get_settings


mongo_client: AsyncIOMotorClient | None = None
mongo_db: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    global mongo_client, mongo_db

    settings = get_settings()
    mongo_client = AsyncIOMotorClient(settings.mongo_uri)
    mongo_db = mongo_client[settings.mongo_db_name]

    await mongo_db.command("ping")


async def close_mongo_connection() -> None:
    global mongo_client, mongo_db

    if mongo_client is not None:
        mongo_client.close()
    mongo_client = None
    mongo_db = None


def get_database() -> AsyncIOMotorDatabase:
    if mongo_db is None:
        raise RuntimeError("Mongo database is not initialized")
    return mongo_db
