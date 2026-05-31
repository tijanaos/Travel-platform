import grpc
from fastapi import HTTPException, status

import user_pb2
import user_pb2_grpc

from app.config import settings


def _get_channel():
    return grpc.insecure_channel(settings.stakeholders_grpc_address)


def validate_token_grpc(token: str) -> dict:
    """Call Stakeholders via gRPC to validate JWT and return user_id + username."""
    try:
        with _get_channel() as channel:
            stub = user_pb2_grpc.UserServiceStub(channel)
            response = stub.ValidateToken(
                user_pb2.ValidateTokenRequest(token=token),
                timeout=5.0,
            )
            return {"user_id": response.user_id, "username": response.username}
    except grpc.RpcError as e:
        if e.code() == grpc.StatusCode.UNAUTHENTICATED:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Stakeholders gRPC unavailable: {e.details()}",
        )


def get_username_by_id_grpc(user_id: int) -> str:
    """Call Stakeholders via gRPC to get username by user ID."""
    try:
        with _get_channel() as channel:
            stub = user_pb2_grpc.UserServiceStub(channel)
            response = stub.GetUsernameById(
                user_pb2.GetUsernameRequest(user_id=user_id),
                timeout=5.0,
            )
            return response.username
    except grpc.RpcError:
        return f"user-{user_id}"
