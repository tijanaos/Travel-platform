import os
import uuid
from pathlib import Path
from typing import List

from fastapi import HTTPException, UploadFile

from app.config import settings
from app.repository import BlogRepository
from app.schemas import BlogCreate, BlogImageOut, BlogOut, CommentCreate, CommentUpdate, CommentOut


class BlogService:
    def __init__(self, repo: BlogRepository):
        self.repo = repo

    async def create_blog(self, data: BlogCreate, images: List[UploadFile]) -> BlogOut:
        blog = await self.repo.create(data)

        upload_path = Path(settings.upload_dir)
        upload_path.mkdir(parents=True, exist_ok=True)

        for image in images:
            if image.filename:
                ext = Path(image.filename).suffix
                unique_name = f"{uuid.uuid4()}{ext}"
                with open(upload_path / unique_name, "wb") as f:
                    f.write(await image.read())
                await self.repo.add_image(blog["id"], unique_name)

        blog = await self.repo.get_by_id(blog["id"])
        return self._to_out(blog)

    async def get_blog(self, blog_id: str, user_id: int | None = None) -> BlogOut:
        blog = await self._get_or_404(blog_id)
        return self._to_out(blog, user_id)

    async def get_all_blogs(self, user_id: int | None = None, author_ids: List[int] | None = None) -> List[BlogOut]:
        if author_ids is not None:
            blogs = await self.repo.get_by_author_ids(author_ids)
        else:
            blogs = await self.repo.get_all()
        return [self._to_out(b, user_id) for b in blogs]

    async def delete_blog(self, blog_id: str, user_id: int) -> None:
        blog = await self._get_or_404(blog_id)
        if blog["author_id"] != user_id:
            raise HTTPException(status_code=403, detail="You are not the author of this blog")
        for image in blog.get("images", []):
            file_path = Path(settings.upload_dir) / image["filename"]
            if file_path.exists():
                os.remove(file_path)
        await self.repo.delete(blog_id)

    async def like_blog(self, blog_id: str, user_id: int) -> BlogOut:
        await self._get_or_404(blog_id)
        success = await self.repo.add_like(blog_id, user_id)
        if not success:
            raise HTTPException(status_code=409, detail="User already liked this blog")
        blog = await self.repo.get_by_id(blog_id)
        return self._to_out(blog, user_id)

    async def unlike_blog(self, blog_id: str, user_id: int) -> BlogOut:
        await self._get_or_404(blog_id)
        success = await self.repo.remove_like(blog_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Like not found")
        blog = await self.repo.get_by_id(blog_id)
        return self._to_out(blog, user_id)

    async def _get_or_404(self, blog_id: str) -> dict:
        blog = await self.repo.get_by_id(blog_id)
        if not blog:
            raise HTTPException(status_code=404, detail="Blog not found")
        return blog

    def _to_out(self, blog: dict, user_id: int | None = None) -> BlogOut:
        likes = blog.get("likes", [])
        return BlogOut(
            id=blog["id"],
            title=blog["title"],
            description=blog["description"],
            created_at=blog["created_at"],
            author_id=blog["author_id"],
            likes_count=len(likes),
            liked_by_me=user_id in likes if user_id is not None else False,
            images=[
                BlogImageOut(id=img["id"], url=f"{settings.base_url}/uploads/{img['filename']}")
                for img in blog.get("images", [])
            ],
        )

    async def add_comment(self, blog_id: str, user_id: int, data: CommentCreate) -> CommentOut:
        await self._get_or_404(blog_id)
        comment = await self.repo.add_comment(blog_id, user_id, data)
        return CommentOut(**comment)

    async def update_comment(self, blog_id: str, comment_id: str, user_id: int, data: CommentUpdate) -> CommentOut:
        await self._get_or_404(blog_id)
        comment = await self.repo.get_comment(blog_id, comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        if comment["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="You are not the author of this comment")
        comment = await self.repo.update_comment(blog_id, comment_id, data)
        return CommentOut(**comment)

    async def delete_comment(self, blog_id: str, comment_id: str, user_id: int) -> None:
        await self._get_or_404(blog_id)
        comment = await self.repo.get_comment(blog_id, comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        if comment["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="You are not the author of this comment")
        await self.repo.delete_comment(blog_id, comment_id)

    async def get_comments(self, blog_id: str) -> List[CommentOut]:
        await self._get_or_404(blog_id)
        comments = await self.repo.get_comments(blog_id)
        return [CommentOut(**c) for c in comments]
