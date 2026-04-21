from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_database
from models.auth import AuthResponse, LoginRequest, RegisterRequest, UpdateAvatarRequest, UserActivityPublic, UserPublic
from services.auth_service import list_user_activities, login_user, register_user, update_user_avatar


router = APIRouter(prefix="/auth", tags=["auth"])


def get_db() -> AsyncIOMotorDatabase:
    return get_database()


@router.post("/register", response_model=AuthResponse)
async def register(payload: RegisterRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    return await register_user(db=db, payload=payload)


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    return await login_user(db=db, payload=payload)


@router.patch("/avatar", response_model=UserPublic)
async def update_avatar(payload: UpdateAvatarRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    return await update_user_avatar(db=db, payload=payload)


@router.get("/{user_id}/activities", response_model=list[UserActivityPublic])
async def get_activities(user_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    return await list_user_activities(db=db, user_id=user_id)
