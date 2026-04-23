from typing import List
from pydantic import BaseModel


class FollowResponse(BaseModel):
    following: List[int]
    followers: List[int]
    is_following: bool


class UserListResponse(BaseModel):
    user_ids: List[int]
