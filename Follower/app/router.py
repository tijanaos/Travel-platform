from typing import List

from fastapi import APIRouter, Depends, Header
from neo4j import Session

from app.auth_client import get_user_id_from_token
from app.database import get_session
from app.service import FollowerService

router = APIRouter(tags=["followers"])


def get_service(session: Session = Depends(get_session)) -> FollowerService:
    return FollowerService(session)


@router.post("/follow/{target_user_id}", status_code=204)
def follow(
    target_user_id: int,
    authorization: str = Header(...),
    service: FollowerService = Depends(get_service),
):
    token = authorization.removeprefix("Bearer ")
    user_id = get_user_id_from_token(token)
    service.follow(user_id, target_user_id)


@router.delete("/follow/{target_user_id}", status_code=204)
def unfollow(
    target_user_id: int,
    authorization: str = Header(...),
    service: FollowerService = Depends(get_service),
):
    token = authorization.removeprefix("Bearer ")
    user_id = get_user_id_from_token(token)
    service.unfollow(user_id, target_user_id)


@router.get("/following", response_model=List[int])
def get_following(
    authorization: str = Header(...),
    service: FollowerService = Depends(get_service),
):
    token = authorization.removeprefix("Bearer ")
    user_id = get_user_id_from_token(token)
    return service.get_following(user_id)


@router.get("/followers", response_model=List[int])
def get_followers(
    authorization: str = Header(...),
    service: FollowerService = Depends(get_service),
):
    token = authorization.removeprefix("Bearer ")
    user_id = get_user_id_from_token(token)
    return service.get_followers(user_id)


@router.get("/is-following/{target_user_id}", response_model=bool)
def is_following(
    target_user_id: int,
    authorization: str = Header(...),
    service: FollowerService = Depends(get_service),
):
    token = authorization.removeprefix("Bearer ")
    user_id = get_user_id_from_token(token)
    return service.is_following(user_id, target_user_id)


@router.get("/recommendations", response_model=List[int])
def get_recommendations(
    authorization: str = Header(...),
    service: FollowerService = Depends(get_service),
):
    token = authorization.removeprefix("Bearer ")
    user_id = get_user_id_from_token(token)
    return service.get_recommendations(user_id)


@router.get("/discover", response_model=List[int])
def get_discoverable_users(
    authorization: str = Header(...),
    service: FollowerService = Depends(get_service),
):
    token = authorization.removeprefix("Bearer ")
    user_id = get_user_id_from_token(token)
    return service.get_discoverable_users(user_id)


@router.get("/feed")
def get_feed(
    authorization: str = Header(...),
    service: FollowerService = Depends(get_service),
):
    token = authorization.removeprefix("Bearer ")
    user_id = get_user_id_from_token(token)
    return service.get_feed(user_id, token)
