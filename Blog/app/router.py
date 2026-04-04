from typing import List

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import BlogOut, BlogUpdate, CommentCreate, CommentUpdate, CommentOut
from app.service import BlogService

router = APIRouter(prefix="/blogs", tags=["blogs"])


def get_service(db: Session = Depends(get_db)) -> BlogService:
    return BlogService(db)


@router.post("/", response_model=BlogOut, status_code=201)
def create_blog(
    title: str = Form(...),
    description: str = Form(...),
    author_id: int = Form(...),
    images: List[UploadFile] = File(default=[]),
    service: BlogService = Depends(get_service),
):
    from app.schemas import BlogCreate
    data = BlogCreate(title=title, description=description, author_id=author_id)
    return service.create_blog(data, images)


@router.get("/", response_model=List[BlogOut])
def get_all_blogs(service: BlogService = Depends(get_service)):
    return service.get_all_blogs()


@router.get("/{blog_id}", response_model=BlogOut)
def get_blog(blog_id: int, service: BlogService = Depends(get_service)):
    return service.get_blog(blog_id)


@router.put("/{blog_id}", response_model=BlogOut)
def update_blog(blog_id: int, data: BlogUpdate, service: BlogService = Depends(get_service)):
    return service.update_blog(blog_id, data)


@router.delete("/{blog_id}", status_code=204)
def delete_blog(blog_id: int, service: BlogService = Depends(get_service)):
    service.delete_blog(blog_id)


@router.post("/{blog_id}/like", response_model=BlogOut)
def like_blog(blog_id: int, user_id: int, service: BlogService = Depends(get_service)):
    return service.like_blog(blog_id, user_id)


@router.delete("/{blog_id}/like", response_model=BlogOut)
def unlike_blog(blog_id: int, user_id: int, service: BlogService = Depends(get_service)):
    return service.unlike_blog(blog_id, user_id)

@router.post("/{blog_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(blog_id: int, data: CommentCreate, service: BlogService = Depends(get_service)):
    return service.add_comment(blog_id, data)


@router.get("/{blog_id}/comments", response_model=List[CommentOut])
def get_comments(blog_id: int, service: BlogService = Depends(get_service)):
    return service.get_comments(blog_id)


@router.put("/{blog_id}/comments/{comment_id}", response_model=CommentOut)
def update_comment(blog_id: int, comment_id: int, data: CommentUpdate, service: BlogService = Depends(get_service)):
    return service.update_comment(blog_id, comment_id, data)


@router.delete("/{blog_id}/comments/{comment_id}", status_code=204)
def delete_comment(blog_id: int, comment_id: int, service: BlogService = Depends(get_service)):
    service.delete_comment(blog_id, comment_id)
