from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class BlogImageOut(BaseModel):
    id: int
    url: str


class BlogCreate(BaseModel):
    title: str
    description: str
    author_id: int


class BlogUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class BlogOut(BaseModel):
    id: int
    title: str
    description: str
    created_at: datetime
    author_id: int
    likes_count: int
    images: List[BlogImageOut]

    model_config = {"from_attributes": True}

class CommentCreate(BaseModel):
    text: str

class CommentUpdate(BaseModel):
    text: str

class CommentOut(BaseModel):
    id: int
    blog_id: int
    user_id: int
    text: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
