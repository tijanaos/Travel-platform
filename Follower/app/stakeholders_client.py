from typing import List

import httpx

from app.config import settings


def get_all_user_ids() -> List[int]:
    url = f"{settings.stakeholders_url}/internal/users"
    try:
        response = httpx.get(url, timeout=10.0)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        raise RuntimeError(f"Failed to fetch user list from Stakeholders: {e}")
