import pytest
from httpx import AsyncClient
from sqlalchemy import select
from app import models, utils
from app.database import async_session


class TestAuth:
    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, auth_headers):
        resp = await client.post("/api/auth/login", json={
            "username": "testadmin",
            "password": "admin123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["username"] == "testadmin"

    @pytest.mark.asyncio
    async def test_login_invalid_credentials(self, client: AsyncClient):
        resp = await client.post("/api/auth/login", json={
            "username": "admin",
            "password": "wrongpassword",
        })
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient):
        resp = await client.post("/api/auth/login", json={
            "username": "nonexistent",
            "password": "password",
        })
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_get_me(self, client: AsyncClient, auth_headers):
        resp = await client.get("/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["username"] == "testadmin"

    @pytest.mark.asyncio
    async def test_get_me_unauthenticated(self, client: AsyncClient):
        resp = await client.get("/api/auth/me")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_register(self, client: AsyncClient, auth_headers):
        resp = await client.post("/api/auth/register", headers=auth_headers, json={
            "username": "newuser",
            "email": "new@test.com",
            "password": "password123",
            "role": "teacher",
        })
        assert resp.status_code == 200
        assert resp.json()["username"] == "newuser"

    @pytest.mark.asyncio
    async def test_register_duplicate(self, client: AsyncClient, auth_headers):
        resp = await client.post("/api/auth/register", headers=auth_headers, json={
            "username": "testadmin",
            "email": "dup@test.com",
            "password": "password123",
            "role": "teacher",
        })
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_protected_endpoint_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/students/")
        assert resp.status_code == 401
