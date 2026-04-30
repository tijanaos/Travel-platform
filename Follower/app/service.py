from typing import List, Optional
from fastapi import HTTPException
from neo4j import Session

from app.repository import FollowerRepository
from app.blog_client import get_blogs_by_author_ids


class FollowerService:
    def __init__(self, session: Session):
        self.repo = FollowerRepository(session)

    def follow(self, follower_id: int, target_id: int) -> None:
        if follower_id == target_id:
            raise HTTPException(status_code=400, detail="Cannot follow yourself")
        self.repo.ensure_user_exists(follower_id)
        success = self.repo.follow(follower_id, target_id)
        if not success:
            raise HTTPException(status_code=409, detail="Already following this user")

    def unfollow(self, follower_id: int, target_id: int) -> None:
        if follower_id == target_id:
            raise HTTPException(status_code=400, detail="Cannot unfollow yourself")
        self.repo.ensure_user_exists(follower_id)
        success = self.repo.unfollow(follower_id, target_id)
        if not success:
            raise HTTPException(status_code=404, detail="Not following this user")

    def get_following(self, user_id: int) -> List[int]:
        self.repo.ensure_user_exists(user_id)
        return self.repo.get_following(user_id)

    def get_followers(self, user_id: int) -> List[int]:
        self.repo.ensure_user_exists(user_id)
        return self.repo.get_followers(user_id)

    def is_following(self, follower_id: int, target_id: int) -> bool:
        return self.repo.is_following(follower_id, target_id)

    def get_recommendations(self, user_id: int) -> List[int]:
        self.repo.ensure_user_exists(user_id)
        return self.repo.get_recommendations(user_id)

    def get_discoverable_users(self, user_id: int) -> List[int]:
        self.repo.ensure_user_exists(user_id)
        return self.repo.get_discoverable_users(user_id)

    def get_feed(self, user_id: int, token: Optional[str] = None) -> List[dict]:
        self.repo.ensure_user_exists(user_id)
        following = self.repo.get_following(user_id)
        return get_blogs_by_author_ids(following, token)
