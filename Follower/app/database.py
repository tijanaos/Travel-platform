from neo4j import GraphDatabase, Driver
from app.config import settings

_driver: Driver | None = None


def init_db() -> None:
    global _driver
    _driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
    )
    with _driver.session() as session:
        # Remove duplicate User nodes before creating uniqueness constraint
        session.run(
            """
            MATCH (u:User)
            WITH u.user_id AS uid, collect(u) AS nodes
            WHERE size(nodes) > 1
            FOREACH (dup IN tail(nodes) | DETACH DELETE dup)
            """
        )
        session.run(
            "CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.user_id IS UNIQUE"
        )


def close_db() -> None:
    if _driver:
        _driver.close()


def get_session():
    session = _driver.session()
    try:
        yield session
    finally:
        session.close()
