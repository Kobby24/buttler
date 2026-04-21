from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from core.security import create_access_token, get_password_hash, verify_password
from models.auth import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    UpdateAvatarRequest,
    UserActivityPublic,
    UserPublic,
)


USERS_COLLECTION = "users"
USER_ACTIVITIES_COLLECTION = "user_activities"


async def ensure_auth_indexes(db: AsyncIOMotorDatabase) -> None:
    await db[USERS_COLLECTION].create_index("email", unique=True)
    await db[USER_ACTIVITIES_COLLECTION].create_index([("user_id", 1), (
        "created_at", -1
    )])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _clean_avatar_details(avatar_details: dict[str, Any] | None) -> dict[str, Any]:
    return avatar_details or {}


def _build_user_id_query(user_id: str) -> dict[str, Any]:
    try:
        return {"_id": ObjectId(user_id)}
    except Exception:
        return {"_id": user_id}


def to_user_public(document: dict) -> UserPublic:
    return UserPublic(
        id=str(document["_id"]),
        name=document["name"],
        email=document["email"],
        created_at=document["created_at"],
        avatar_url=document.get("avatar_url"),
        avatar_details=_clean_avatar_details(document.get("avatar_details")),
        last_activity_at=document.get("last_activity_at"),
    )


def to_user_activity_public(document: dict) -> UserActivityPublic:
    return UserActivityPublic(
        id=str(document["_id"]),
        user_id=str(document["user_id"]),
        activity_type=document["activity_type"],
        metadata=document.get("metadata", {}),
        created_at=document["created_at"],
    )


async def record_user_activity(
    db: AsyncIOMotorDatabase,
    user_id: str,
    activity_type: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    await db[USER_ACTIVITIES_COLLECTION].insert_one(
        {
            "user_id": user_id,
            "activity_type": activity_type,
            "metadata": metadata or {},
            "created_at": _now(),
        }
    )


async def register_user(db: AsyncIOMotorDatabase, payload: RegisterRequest) -> AuthResponse:
    email = payload.email.lower()
    existing_user = await db[USERS_COLLECTION].find_one({"email": email})
    if existing_user:
        raise HTTPException(status_code=400, detail={"message": "Email already registered"})

    now = _now()
    user_doc = {
        "name": payload.name,
        "email": email,
        "password_hash": get_password_hash(payload.password),
        "created_at": now,
        "updated_at": now,
        "last_activity_at": now,
        "avatar_url": payload.avatar_url,
        "avatar_details": _clean_avatar_details(payload.avatar_details),
    }

    try:
        insert_result = await db[USERS_COLLECTION].insert_one(user_doc)
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=400, detail={"message": "Email already registered"}) from exc
    user_doc["_id"] = insert_result.inserted_id

    await record_user_activity(
        db,
        user_id=str(insert_result.inserted_id),
        activity_type="register",
        metadata={
            "avatar_url": payload.avatar_url,
            "has_avatar_details": bool(payload.avatar_details),
        },
    )

    user = to_user_public(user_doc)
    access_token = create_access_token(subject=user.id, extra_claims={"email": user.email})

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=user,
        message="Registration successful",
    )


async def login_user(db: AsyncIOMotorDatabase, payload: LoginRequest) -> AuthResponse:
    email = payload.email.lower()
    user_doc = await db[USERS_COLLECTION].find_one({"email": email})

    if not user_doc:
        raise HTTPException(status_code=401, detail={"message": "Invalid credentials"})

    if not verify_password(payload.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail={"message": "Invalid credentials"})

    now = _now()
    await db[USERS_COLLECTION].update_one(
        {"_id": user_doc["_id"]},
        {"$set": {"last_activity_at": now, "updated_at": now}},
    )
    user_doc["last_activity_at"] = now

    await record_user_activity(db, user_id=str(user_doc["_id"]), activity_type="login")

    user = to_user_public(user_doc)
    access_token = create_access_token(subject=user.id, extra_claims={"email": user.email})

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=user,
        message="Login successful",
    )


async def update_user_avatar(db: AsyncIOMotorDatabase, payload: UpdateAvatarRequest) -> UserPublic:
    now = _now()
    result = await db[USERS_COLLECTION].update_one(
        _build_user_id_query(payload.user_id),
        {
            "$set": {
                "avatar_url": payload.avatar_url,
                "avatar_details": _clean_avatar_details(payload.avatar_details),
                "last_activity_at": now,
                "updated_at": now,
            }
        },
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail={"message": "User not found"})

    user_doc = await db[USERS_COLLECTION].find_one(_build_user_id_query(payload.user_id))
    if not user_doc:
        raise HTTPException(status_code=404, detail={"message": "User not found"})

    await record_user_activity(
        db,
        user_id=payload.user_id,
        activity_type="avatar_update",
        metadata={
            "avatar_url": payload.avatar_url,
            "has_avatar_details": bool(payload.avatar_details),
        },
    )

    return to_user_public(user_doc)


async def list_user_activities(
    db: AsyncIOMotorDatabase,
    user_id: str,
    limit: int = 50,
) -> list[UserActivityPublic]:
    cursor = (
        db[USER_ACTIVITIES_COLLECTION]
        .find({"user_id": user_id})
        .sort("created_at", -1)
        .limit(limit)
    )
    documents = await cursor.to_list(length=limit)
    return [to_user_activity_public(document) for document in documents]
