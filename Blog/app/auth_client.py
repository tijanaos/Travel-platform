from fastapi import HTTPException, status

from app.stakeholders_grpc_client import validate_token_grpc


def get_user_id_from_token(token: str) -> int:
    result = validate_token_grpc(token)
    return result["user_id"]


def get_username_from_token(token: str) -> str:
    try:
        result = validate_token_grpc(token)
        return result.get("username", "unknown")
    except HTTPException:
        return "unknown"


def try_get_user_id_from_token(token: str) -> int | None:
    try:
        return get_user_id_from_token(token)
    except HTTPException:
        return None
