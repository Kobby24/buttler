from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    avatar_url: str | None = Field(default=None, max_length=500)
    avatar_details: dict[str, Any] = Field(default_factory=dict)


class LoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserPublic(BaseModel):
    id: str
    name: str
    email: EmailStr
    created_at: datetime
    avatar_url: str | None = None
    avatar_details: dict[str, Any] = Field(default_factory=dict)
    last_activity_at: datetime | None = None


class UpdateAvatarRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    user_id: str = Field(min_length=1)
    avatar_url: str | None = Field(default=None, max_length=500)
    avatar_details: dict[str, Any] = Field(default_factory=dict)


class UserActivityPublic(BaseModel):
    id: str
    user_id: str
    activity_type: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
    message: str
