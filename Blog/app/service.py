import os
import uuid
from pathlib import Path
from typing import List

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Blog
from app.repository import BlogRepository
from app.schemas import BlogCreate, BlogImageOut, BlogOut, BlogUpdate, CommentCreate, CommentUpdate, CommentOut


class BlogService:
    def __init__(self, db: Session):
        self.repo = BlogRepository(db)

    def create_blog(self, data: BlogCreate, images: List[UploadFile]) -> BlogOut:
        blog = self.repo.create(data)

        upload_path = Path(settings.upload_dir)
        upload_path.mkdir(parents=True, exist_ok=True)

        for image in images:
            if image.filename:
                ext = Path(image.filename).suffix
                unique_name = f"{uuid.uuid4()}{ext}"
                with open(upload_path / unique_name, "wb") as f:
                    f.write(image.file.read())
                self.repo.add_image(blog.id, unique_name)

        return self._to_out(self.repo.get_by_id(blog.id))

    def get_blog(self, blog_id: int) -> BlogOut:
        blog = self._get_or_404(blog_id)
        return self._to_out(blog)

    def get_all_blogs(self) -> List[BlogOut]:
        return [self._to_out(b) for b in self.repo.get_all()]

    def update_blog(self, blog_id: int, data: BlogUpdate) -> BlogOut:
        blog = self._get_or_404(blog_id)
        blog = self.repo.update(blog, data)
        return self._to_out(blog)

    def delete_blog(self, blog_id: int) -> None:
        blog = self._get_or_404(blog_id)
        for image in blog.images:
            file_path = Path(settings.upload_dir) / image.filename
            if file_path.exists():
                os.remove(file_path)
        self.repo.delete(blog)

    def like_blog(self, blog_id: int, user_id: int) -> BlogOut:
        self._get_or_404(blog_id)
        success = self.repo.add_like(blog_id, user_id)
        if not success:
            raise HTTPException(status_code=409, detail="User already liked this blog")
        return self._to_out(self.repo.get_by_id(blog_id))

    def unlike_blog(self, blog_id: int, user_id: int) -> BlogOut:
        self._get_or_404(blog_id)
        success = self.repo.remove_like(blog_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Like not found")
        return self._to_out(self.repo.get_by_id(blog_id))

    def _get_or_404(self, blog_id: int) -> Blog:
        blog = self.repo.get_by_id(blog_id)
        if not blog:
            raise HTTPException(status_code=404, detail="Blog not found")
        return blog

    def _to_out(self, blog: Blog) -> BlogOut:
        return BlogOut(
            id=blog.id,
            title=blog.title,
            description=blog.description,
            created_at=blog.created_at,
            author_id=blog.author_id,
            likes_count=len(blog.likes),
            images=[
                BlogImageOut(id=img.id, url=f"{settings.base_url}/uploads/{img.filename}")
                for img in blog.images
            ],
        )
    
    def add_comment(self, blog_id: int, data: CommentCreate) -> CommentOut:
        self._get_or_404(blog_id)
        comment = self.repo.add_comment(blog_id, data)
        return CommentOut.model_validate(comment)

    def get_comments(self, blog_id: int) -> list[CommentOut]:
        self._get_or_404(blog_id)
        return [CommentOut.model_validate(c) for c in self.repo.get_comments(blog_id)]

    def update_comment(self, blog_id: int, comment_id: int, data: CommentUpdate) -> CommentOut:
        self._get_or_404(blog_id)
        comment = self.repo.get_comment(comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        comment = self.repo.update_comment(comment, data)
        return CommentOut.model_validate(comment)

    def delete_comment(self, blog_id: int, comment_id: int) -> None:
        self._get_or_404(blog_id)
        comment = self.repo.get_comment(comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        self.repo.delete_comment(comment)
