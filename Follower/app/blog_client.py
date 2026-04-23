from typing import List, Optional
import httpx
from fastapi import HTTPException
from app.config import settings


def get_blogs_by_author_ids(author_ids: List[int], token: Optional[str] = None) -> List[dict]:
    if not author_ids:
        return []

    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        response = httpx.get(
            f"{settings.blog_url}/blogs",
            params={"author_ids": ",".join(str(i) for i in author_ids)},
            headers=headers,
            timeout=5.0,
            follow_redirects=True,
        )
        response.raise_for_status()
        return response.json()
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="Blog service is unavailable")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Blog service error: {e.response.status_code}")
