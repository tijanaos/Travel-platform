from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class BlogImageOut(BaseModel):
    id: str
    url: str


class BlogCreate(BaseModel):
    title: str
    description: str
    author_id: int


class BlogUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class BlogOut(BaseModel):
    id: str
    title: str
    description: str
    created_at: datetime
    author_id: int
    likes_count: int
    liked_by_me: bool
    images: List[BlogImageOut]


class CommentCreate(BaseModel):
    text: str


class CommentUpdate(BaseModel):
    text: str


class CommentOut(BaseModel):
    id: str
    blog_id: str
    user_id: int
    username: str
    text: str
    created_at: datetime
    updated_at: datetime
