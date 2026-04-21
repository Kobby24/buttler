from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext

from core.config import get_settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, expires_minutes: int | None = None, extra_claims: dict | None = None) -> str:
    settings = get_settings()
    lifetime = expires_minutes if expires_minutes is not None else settings.jwt_access_token_expire_minutes
    expire = datetime.now(timezone.utc) + timedelta(minutes=lifetime)

    payload = {"sub": subject, "exp": expire}
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
