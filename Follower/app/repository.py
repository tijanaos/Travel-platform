from typing import List
from neo4j import Session


class FollowerRepository:
    def __init__(self, session: Session):
        self.session = session

    def ensure_user_exists(self, user_id: int) -> None:
        self.session.run(
            "MERGE (:User {user_id: $user_id})",
            user_id=user_id,
        )

    def follow(self, follower_id: int, target_id: int) -> bool:
        if follower_id == target_id:
            return False
        result = self.session.run(
            """
            MATCH (a:User {user_id: $follower_id})-[:FOLLOWS]->(b:User {user_id: $target_id})
            RETURN count(*) AS cnt
            """,
            follower_id=follower_id,
            target_id=target_id,
        )
        if result.single()["cnt"] > 0:
            return False

        self.session.run(
            """
            MERGE (a:User {user_id: $follower_id})
            MERGE (b:User {user_id: $target_id})
            MERGE (a)-[:FOLLOWS]->(b)
            """,
            follower_id=follower_id,
            target_id=target_id,
        )
        return True

    def unfollow(self, follower_id: int, target_id: int) -> bool:
        result = self.session.run(
            """
            MATCH (a:User {user_id: $follower_id})-[r:FOLLOWS]->(b:User {user_id: $target_id})
            DELETE r
            """,
            follower_id=follower_id,
            target_id=target_id,
        )
        return result.consume().counters.relationships_deleted > 0

    def get_following(self, user_id: int) -> List[int]:
        result = self.session.run(
            """
            MATCH (a:User {user_id: $user_id})-[:FOLLOWS]->(b:User)
            RETURN b.user_id AS user_id
            """,
            user_id=user_id,
        )
        return [record["user_id"] for record in result]

    def get_followers(self, user_id: int) -> List[int]:
        result = self.session.run(
            """
            MATCH (a:User)-[:FOLLOWS]->(b:User {user_id: $user_id})
            RETURN a.user_id AS user_id
            """,
            user_id=user_id,
        )
        return [record["user_id"] for record in result]

    def is_following(self, follower_id: int, target_id: int) -> bool:
        result = self.session.run(
            """
            MATCH (a:User {user_id: $follower_id})-[:FOLLOWS]->(b:User {user_id: $target_id})
            RETURN count(*) AS cnt
            """,
            follower_id=follower_id,
            target_id=target_id,
        )
        return result.single()["cnt"] > 0

    def get_discoverable_users(self, user_id: int) -> List[int]:
        # All users in graph except self (including already-followed so frontend can show status)
        result = self.session.run(
            """
            MATCH (u:User)
            WHERE u.user_id <> $user_id
            RETURN DISTINCT u.user_id AS user_id
            ORDER BY u.user_id
            """,
            user_id=user_id,
        )
        return [record["user_id"] for record in result]

    def get_recommendations(self, user_id: int, limit: int = 10) -> List[int]:
        # Friends-of-friends not yet followed, ranked by how many mutual connections suggest them
        result = self.session.run(
            """
            MATCH (me:User {user_id: $user_id})-[:FOLLOWS]->(friend)-[:FOLLOWS]->(rec:User)
            WHERE rec.user_id <> $user_id
              AND NOT (me)-[:FOLLOWS]->(rec)
            RETURN rec.user_id AS user_id, count(*) AS score
            ORDER BY score DESC
            LIMIT $limit
            """,
            user_id=user_id,
            limit=limit,
        )
        return [record["user_id"] for record in result]
