from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models import BLOGS_COLLECTION
from app.schemas import BlogCreate, BlogUpdate, CommentCreate, CommentUpdate


def _normalize_blog(doc: dict) -> dict:
    blog_id = str(doc["_id"])
    doc["id"] = blog_id
    del doc["_id"]
    doc["images"] = [
        {"id": str(img["_id"]), "filename": img["filename"]}
        for img in doc.get("images", [])
    ]
    doc["comments"] = [
        {
            "id": str(c["_id"]),
            "blog_id": blog_id,
            "user_id": c["user_id"],
            "username": c.get("username", "unknown"),
            "text": c["text"],
            "created_at": c["created_at"],
            "updated_at": c["updated_at"],
        }
        for c in doc.get("comments", [])
    ]
    return doc


class BlogRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.col = db[BLOGS_COLLECTION]

    async def create(self, data: BlogCreate) -> dict:
        doc = {
            "title": data.title,
            "description": data.description,
            "author_id": data.author_id,
            "created_at": datetime.utcnow(),
            "images": [],
            "likes": [],
            "comments": [],
        }
        result = await self.col.insert_one(doc)
        doc["_id"] = result.inserted_id
        return _normalize_blog(doc)

    async def get_by_id(self, blog_id: str) -> Optional[dict]:
        if not ObjectId.is_valid(blog_id):
            return None
        doc = await self.col.find_one({"_id": ObjectId(blog_id)})
        return _normalize_blog(doc) if doc else None

    async def get_all(self) -> List[dict]:
        docs = await self.col.find().sort("created_at", -1).to_list(None)
        return [_normalize_blog(d) for d in docs]

    async def get_by_author_ids(self, author_ids: List[int]) -> List[dict]:
        docs = await self.col.find({"author_id": {"$in": author_ids}}).sort("created_at", -1).to_list(None)
        return [_normalize_blog(d) for d in docs]

    async def delete(self, blog_id: str) -> None:
        await self.col.delete_one({"_id": ObjectId(blog_id)})

    async def add_image(self, blog_id: str, filename: str) -> None:
        await self.col.update_one(
            {"_id": ObjectId(blog_id)},
            {"$push": {"images": {"_id": ObjectId(), "filename": filename}}},
        )

    async def add_like(self, blog_id: str, user_id: int) -> bool:
        existing = await self.col.find_one({"_id": ObjectId(blog_id), "likes": user_id})
        if existing:
            return False
        await self.col.update_one(
            {"_id": ObjectId(blog_id)},
            {"$push": {"likes": user_id}},
        )
        return True

    async def remove_like(self, blog_id: str, user_id: int) -> bool:
        result = await self.col.update_one(
            {"_id": ObjectId(blog_id)},
            {"$pull": {"likes": user_id}},
        )
        return result.modified_count > 0

    async def add_comment(self, blog_id: str, user_id: int, username: str, data: CommentCreate) -> dict:
        comment_id = ObjectId()
        now = datetime.utcnow()
        comment_doc = {
            "_id": comment_id,
            "user_id": user_id,
            "username": username,
            "text": data.text,
            "created_at": now,
            "updated_at": now,
        }
        await self.col.update_one(
            {"_id": ObjectId(blog_id)},
            {"$push": {"comments": comment_doc}},
        )
        return {
            "id": str(comment_id),
            "blog_id": blog_id,
            "user_id": user_id,
            "username": username,
            "text": data.text,
            "created_at": now,
            "updated_at": now,
        }

    async def get_comments(self, blog_id: str) -> List[dict]:
        doc = await self.col.find_one({"_id": ObjectId(blog_id)}, {"comments": 1})
        if not doc:
            return []
        return [
            {
                "id": str(c["_id"]),
                "blog_id": blog_id,
                "user_id": c["user_id"],
                "username": c.get("username", "unknown"),
                "text": c["text"],
                "created_at": c["created_at"],
                "updated_at": c["updated_at"],
            }
            for c in doc.get("comments", [])
        ]

    async def get_comment(self, blog_id: str, comment_id: str) -> Optional[dict]:
        if not ObjectId.is_valid(comment_id):
            return None
        doc = await self.col.find_one(
            {"_id": ObjectId(blog_id), "comments._id": ObjectId(comment_id)},
            {"comments.$": 1},
        )
        if not doc or not doc.get("comments"):
            return None
        c = doc["comments"][0]
        return {
            "id": str(c["_id"]),
            "blog_id": blog_id,
            "user_id": c["user_id"],
            "username": c.get("username", "unknown"),
            "text": c["text"],
            "created_at": c["created_at"],
            "updated_at": c["updated_at"],
        }

    async def update_comment(self, blog_id: str, comment_id: str, data: CommentUpdate) -> Optional[dict]:
        now = datetime.utcnow()
        await self.col.update_one(
            {"_id": ObjectId(blog_id), "comments._id": ObjectId(comment_id)},
            {"$set": {"comments.$.text": data.text, "comments.$.updated_at": now}},
        )
        return await self.get_comment(blog_id, comment_id)

    async def delete_comment(self, blog_id: str, comment_id: str) -> None:
        await self.col.update_one(
            {"_id": ObjectId(blog_id)},
            {"$pull": {"comments": {"_id": ObjectId(comment_id)}}},
        )
