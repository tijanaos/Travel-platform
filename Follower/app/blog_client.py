from typing import List, Optional

import grpc
from fastapi import HTTPException

import blog_pb2
import blog_pb2_grpc
from app.config import settings


def get_blogs_by_author_ids(author_ids: List[int], token: Optional[str] = None) -> List[dict]:
    if not author_ids:
        return []

    channel = grpc.insecure_channel(settings.blog_grpc_address)
    stub = blog_pb2_grpc.BlogServiceStub(channel)
    try:
        response = stub.GetBlogsByAuthorIds(
            blog_pb2.GetBlogsByAuthorIdsRequest(author_ids=author_ids)
        )
        return [
            {
                "id": b.id,
                "title": b.title,
                "description": b.description,
                "created_at": b.created_at,
                "author_id": b.author_id,
                "likes_count": b.likes_count,
                "liked_by_me": b.liked_by_me,
                "images": [{"id": img.id, "url": img.url} for img in b.images],
            }
            for b in response.blogs
        ]
    except grpc.RpcError as e:
        raise HTTPException(status_code=503, detail=f"Blog service unavailable: {e.details()}")
    finally:
        channel.close()
