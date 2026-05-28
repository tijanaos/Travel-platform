from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db: str = "blog"
    server_port: int = 8081
    upload_dir: str = "uploads"
    base_url: str = "http://localhost:8081"
    stakeholders_url: str = "http://stakeholders-service:8080"
    grpc_port: int = 9092

    model_config = {"env_file": ".env"}


settings = Settings()
