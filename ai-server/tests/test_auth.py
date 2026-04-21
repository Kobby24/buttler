import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient

from core.config import get_settings
from main import app
from routes.auth import get_db


@pytest_asyncio.fixture
async def test_user_context():
    settings = get_settings()
    mongo_client = AsyncIOMotorClient(settings.mongo_uri)
    db = mongo_client[settings.mongo_db_name]
    await db.command("ping")

    unique_id = uuid.uuid4().hex
    credentials = {
        "name": "QA Test User",
        "email": f"qa-{unique_id}@example.com",
        "password": "TestPass123!",
    }
    wrong_password = "WrongPass123!"

    app.dependency_overrides[get_db] = lambda: db

    try:
        yield {
            "db": db,
            "credentials": credentials,
            "wrong_password": wrong_password,
        }
    finally:
        await db["users"].delete_one({"email": credentials["email"]})
        await db["user_activities"].delete_many({"user_id": {"$exists": True}})
        app.dependency_overrides.clear()
        mongo_client.close()


@pytest_asyncio.fixture
async def async_client(test_user_context):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.mark.asyncio
async def test_register_user_success(async_client, test_user_context):
    payload = test_user_context["credentials"]

    response = await async_client.post("/auth/register", json=payload)

    assert response.status_code in (200, 201)
    data = response.json()
    assert data["message"] == "Registration successful"
    assert data["token_type"] == "bearer"
    assert data["access_token"]
    assert data["user"]["name"] == payload["name"]
    assert data["user"]["email"] == payload["email"]
    assert data["user"]["id"]
    assert data["user"]["avatar_url"] is None
    assert data["user"]["avatar_details"] == {}


@pytest.mark.asyncio
async def test_duplicate_registration_fails_with_400(async_client, test_user_context):
    payload = test_user_context["credentials"]

    first_response = await async_client.post("/auth/register", json=payload)
    assert first_response.status_code in (200, 201)

    duplicate_response = await async_client.post("/auth/register", json=payload)

    assert duplicate_response.status_code == 400
    data = duplicate_response.json()
    assert data["message"] == "Email already registered"


@pytest.mark.asyncio
async def test_login_success_returns_access_token(async_client, test_user_context):
    payload = test_user_context["credentials"]

    register_response = await async_client.post("/auth/register", json=payload)
    assert register_response.status_code in (200, 201)

    login_response = await async_client.post(
        "/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )

    assert login_response.status_code == 200
    data = login_response.json()
    assert data["message"] == "Login successful"
    assert data["token_type"] == "bearer"
    assert data["access_token"]
    assert data["user"]["email"] == payload["email"]


@pytest.mark.asyncio
async def test_login_wrong_password_fails_with_401(async_client, test_user_context):
    payload = test_user_context["credentials"]

    register_response = await async_client.post("/auth/register", json=payload)
    assert register_response.status_code in (200, 201)

    login_response = await async_client.post(
        "/auth/login",
        json={"email": payload["email"], "password": test_user_context["wrong_password"]},
    )

    assert login_response.status_code == 401
    data = login_response.json()
    assert data["message"] == "Invalid credentials"


@pytest.mark.asyncio
async def test_avatar_update_persists_and_tracks_activity(async_client, test_user_context):
    payload = test_user_context["credentials"]

    register_response = await async_client.post("/auth/register", json=payload)
    assert register_response.status_code in (200, 201)
    user = register_response.json()["user"]

    avatar_payload = {
        "user_id": user["id"],
        "avatar_url": "https://example.com/avatar.png",
        "avatar_details": {
            "style": "minimal",
            "theme": "dark",
            "source": "upload",
        },
    }

    avatar_response = await async_client.patch("/auth/avatar", json=avatar_payload)
    assert avatar_response.status_code == 200
    avatar_data = avatar_response.json()
    assert avatar_data["avatar_url"] == avatar_payload["avatar_url"]
    assert avatar_data["avatar_details"] == avatar_payload["avatar_details"]

    activities_response = await async_client.get(f"/auth/{user['id']}/activities")
    assert activities_response.status_code == 200
    activities = activities_response.json()
    activity_types = {item["activity_type"] for item in activities}
    assert "register" in activity_types
    assert "avatar_update" in activity_types
