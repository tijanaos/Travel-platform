from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, Header, Query, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.repository import BlogRepository
from app.schemas import BlogCreate, BlogOut, CommentCreate, CommentUpdate, CommentOut
from app.service import BlogService
from app.auth_client import get_user_id_from_token, try_get_user_id_from_token, get_username_from_token

router = APIRouter(prefix="/blogs", tags=["blogs"])


def get_service(db: AsyncIOMotorDatabase = Depends(get_db)) -> BlogService:
    return BlogService(BlogRepository(db))


@router.post("/", response_model=BlogOut, status_code=201)
async def create_blog(
    title: str = Form(...),
    description: str = Form(...),
    images: List[UploadFile] = File(default=[]),
    authorization: str = Header(...),
    service: BlogService = Depends(get_service),
):
    token = authorization.removeprefix("Bearer ")
    author_id = get_user_id_from_token(token)
    data = BlogCreate(title=title, description=description, author_id=author_id)
    return await service.create_blog(data, images)


@router.get("/", response_model=List[BlogOut])
async def get_all_blogs(
    authorization: Optional[str] = Header(default=None),
    author_ids: Optional[str] = Query(default=None, description="Comma-separated author IDs"),
    service: BlogService = Depends(get_service),
):
    user_id = try_get_user_id_from_token(authorization.removeprefix("Bearer ")) if authorization else None
    parsed = [int(x) for x in author_ids.split(",") if x.strip()] if author_ids else None
    return await service.get_all_blogs(user_id, parsed)

@router.post("/internal", response_model=BlogOut, status_code=201)
async def create_blog_internal(
    data: BlogCreate,
    service: BlogService = Depends(get_service),
):
    return await service.create_blog_internal(data)


@router.delete("/internal/{blog_id}", status_code=204)
async def delete_blog_internal(
    blog_id: str,
    service: BlogService = Depends(get_service),
):
    await service.delete_blog_internal(blog_id)

@router.get("/{blog_id}", response_model=BlogOut)
async def get_blog(blog_id: str, authorization: Optional[str] = Header(default=None), service: BlogService = Depends(get_service)):
    user_id = try_get_user_id_from_token(authorization.removeprefix("Bearer ")) if authorization else None
    return await service.get_blog(blog_id, user_id)


@router.delete("/{blog_id}", status_code=204)
async def delete_blog(blog_id: str, authorization: str = Header(...), service: BlogService = Depends(get_service)):
    token = authorization.removeprefix("Bearer ")
    user_id = get_user_id_from_token(token)
    await service.delete_blog(blog_id, user_id)


@router.post("/{blog_id}/like", response_model=BlogOut)
async def like_blog(blog_id: str, authorization: str = Header(...), service: BlogService = Depends(get_service)):
    token = authorization.removeprefix("Bearer ")
    user_id = get_user_id_from_token(token)
    return await service.like_blog(blog_id, user_id)


@router.delete("/{blog_id}/like", response_model=BlogOut)
async def unlike_blog(blog_id: str, authorization: str = Header(...), service: BlogService = Depends(get_service)):
    token = authorization.removeprefix("Bearer ")
    user_id = get_user_id_from_token(token)
    return await service.unlike_blog(blog_id, user_id)


@router.post("/{blog_id}/comments", response_model=CommentOut, status_code=201)
async def add_comment(blog_id: str, data: CommentCreate, authorization: str = Header(...), service: BlogService = Depends(get_service)):
    token = authorization.removeprefix("Bearer ")
    user_id = get_user_id_from_token(token)
    username = get_username_from_token(token)
    return await service.add_comment(blog_id, user_id, username, data)


@router.put("/{blog_id}/comments/{comment_id}", response_model=CommentOut)
async def update_comment(blog_id: str, comment_id: str, data: CommentUpdate, authorization: str = Header(...), service: BlogService = Depends(get_service)):
    token = authorization.removeprefix("Bearer ")
    user_id = get_user_id_from_token(token)
    return await service.update_comment(blog_id, comment_id, user_id, data)


@router.delete("/{blog_id}/comments/{comment_id}", status_code=204)
async def delete_comment(blog_id: str, comment_id: str, authorization: str = Header(...), service: BlogService = Depends(get_service)):
    token = authorization.removeprefix("Bearer ")
    user_id = get_user_id_from_token(token)
    await service.delete_comment(blog_id, comment_id, user_id)


@router.get("/{blog_id}/comments", response_model=List[CommentOut])
async def get_comments(blog_id: str, service: BlogService = Depends(get_service)):
    return await service.get_comments(blog_id)
