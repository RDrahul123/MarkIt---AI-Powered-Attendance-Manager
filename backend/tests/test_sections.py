import pytest
from httpx import AsyncClient
from app import models
from app.database import async_session


class TestSections:
    @pytest.mark.asyncio
    async def test_list_years(self, client: AsyncClient, auth_headers):
        resp = await client.get("/api/sections/years", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) > 0

    @pytest.mark.asyncio
    async def test_create_year(self, client: AsyncClient, auth_headers):
        resp = await client.post("/api/sections/years", headers=auth_headers, json={
            "name": "2024-2025",
            "is_active": False,
        })
        assert resp.status_code == 200
        assert resp.json()["name"] == "2024-2025"

    @pytest.mark.asyncio
    async def test_create_section(self, client: AsyncClient, auth_headers):
        resp = await client.post("/api/sections/", headers=auth_headers, json={
            "name": "Section B",
            "academic_year_id": 1,
        })
        assert resp.status_code == 200
        assert resp.json()["name"] == "Section B"

    @pytest.mark.asyncio
    async def test_create_subject(self, client: AsyncClient, auth_headers):
        resp = await client.post("/api/sections/subjects/", headers=auth_headers, json={
            "code": "MATH101",
            "name": "Mathematics",
            "section_id": 1,
        })
        assert resp.status_code == 200
        assert resp.json()["code"] == "MATH101"

    @pytest.mark.asyncio
    async def test_list_sections(self, client: AsyncClient, auth_headers):
        resp = await client.get("/api/sections/?academic_year_id=1", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) > 0

    @pytest.mark.asyncio
    async def test_list_subjects(self, client: AsyncClient, auth_headers):
        resp = await client.get("/api/sections/subjects/?section_id=1", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) > 0

    @pytest.mark.asyncio
    async def test_list_years_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/sections/years")
        assert resp.status_code == 401
