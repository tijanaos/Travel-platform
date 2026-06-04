import asyncio
import json
import logging
import os

import nats

from app.database import get_db
from app.repository import BlogRepository
from app.schemas import BlogCreate

logger = logging.getLogger(__name__)

async def handle_publish_create(msg):
    try:
        data = json.loads(msg.data.decode())

        db = get_db()
        repo = BlogRepository(db)

        blog_data = BlogCreate(
            title=data["title"],
            description=data["description"],
            author_id=data["authorId"],
        )
        blog = await repo.create(blog_data)

        response = json.dumps({
            "status": "success",
            "blogPostId": blog["id"]
        }).encode()

    except Exception as e:
        logger.error(f"Saga create failed: {e}")
        response = json.dumps({
            "status": "error",
            "error": str(e)
        }).encode()

    await msg.respond(response)


async def handle_publish_rollback(msg):
    try:
        data = json.loads(msg.data.decode())
        blog_id = data.get("blogPostId")
        if blog_id:
            db = get_db()
            repo = BlogRepository(db)
            await repo.delete(blog_id)
            logger.info(f"Rollback: deleted blog {blog_id}")
    except Exception as e:
        logger.error(f"Rollback failed: {e}")


async def start_saga_subscriber():
    nats_url = os.getenv("NATS_URL", "nats://localhost:4222")
    nc = await nats.connect(nats_url)

    await nc.subscribe("tour.publish.create",   cb=handle_publish_create)
    await nc.subscribe("tour.publish.rollback", cb=handle_publish_rollback)

    logger.info("NATS saga subscriber started")
    return nc