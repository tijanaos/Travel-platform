from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "followerpass"
    server_port: int = 8083
    stakeholders_url: str = "http://stakeholders-service:8080"
    blog_url: str = "http://blog-service:8081"
    blog_grpc_address: str = "blog-service:9092"

    model_config = {"env_file": ".env"}


settings = Settings()
