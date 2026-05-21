import httpx
from fastapi import HTTPException, status

from app.config import settings


def get_user_id_from_token(token: str) -> int:
    url = f"{settings.stakeholders_url}/api/auth/validate"
    try:
        response = httpx.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=5.0)
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stakeholders service is unavailable",
        )

    if response.status_code == status.HTTP_401_UNAUTHORIZED:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unexpected response from stakeholders service",
        )

    return response.json()["user_id"]


def get_username_from_token(token: str) -> str:
    url = f"{settings.stakeholders_url}/api/auth/validate"
    try:
        response = httpx.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=5.0)
        if response.status_code == 200:
            return response.json().get("username", "unknown")
        return "unknown"
    except Exception:
        return "unknown"


def try_get_user_id_from_token(token: str) -> int | None:
    try:
        return get_user_id_from_token(token)
    except Exception:
        return None