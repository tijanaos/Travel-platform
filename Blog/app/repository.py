from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models import Blog, BlogImage, BlogLike, Comment
from app.schemas import BlogCreate, BlogUpdate, CommentCreate, CommentUpdate


class BlogRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, data: BlogCreate) -> Blog:
        blog = Blog(title=data.title, description=data.description, author_id=data.author_id)
        self.db.add(blog)
        self.db.commit()
        self.db.refresh(blog)
        return blog

    def get_by_id(self, blog_id: int) -> Optional[Blog]:
        return self.db.query(Blog).filter(Blog.id == blog_id).first()

    def get_all(self) -> List[Blog]:
        return self.db.query(Blog).order_by(Blog.created_at.desc()).all()

    def update(self, blog: Blog, data: BlogUpdate) -> Blog:
        if data.title is not None:
            blog.title = data.title
        if data.description is not None:
            blog.description = data.description
        self.db.commit()
        self.db.refresh(blog)
        return blog

    def delete(self, blog: Blog) -> None:
        self.db.delete(blog)
        self.db.commit()

    def add_image(self, blog_id: int, filename: str) -> BlogImage:
        image = BlogImage(blog_id=blog_id, filename=filename)
        self.db.add(image)
        self.db.commit()
        self.db.refresh(image)
        return image

    def add_like(self, blog_id: int, user_id: int) -> bool:
        like = BlogLike(blog_id=blog_id, user_id=user_id)
        self.db.add(like)
        try:
            self.db.commit()
            return True
        except IntegrityError:
            self.db.rollback()
            return False

    def remove_like(self, blog_id: int, user_id: int) -> bool:
        like = (
            self.db.query(BlogLike)
            .filter(BlogLike.blog_id == blog_id, BlogLike.user_id == user_id)
            .first()
        )
        if not like:
            return False
        self.db.delete(like)
        self.db.commit()
        return True
    
    def add_comment(self, blog_id: int, user_id: int, data: CommentCreate) -> Comment:
        comment = Comment(blog_id=blog_id, user_id=user_id, text=data.text)
        self.db.add(comment)
        self.db.commit()
        self.db.refresh(comment)
        return comment

    def get_comments(self, blog_id: int) -> list[Comment]:
        return self.db.query(Comment).filter(Comment.blog_id == blog_id).all()

    def get_comment(self, comment_id: int) -> Comment | None:
        return self.db.query(Comment).filter(Comment.id == comment_id).first()

    def update_comment(self, comment: Comment, data: CommentUpdate) -> Comment:
        comment.text = data.text
        self.db.commit()
        self.db.refresh(comment)
        return comment

    def delete_comment(self, comment: Comment) -> None:
        self.db.delete(comment)
        self.db.commit()
