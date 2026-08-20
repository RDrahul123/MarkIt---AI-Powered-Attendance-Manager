import pytest
from httpx import AsyncClient


class TestDashboard:
    @pytest.mark.asyncio
    async def test_stats(self, client: AsyncClient, auth_headers):
        resp = await client.get("/api/dashboard/stats", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_students" in data
        assert "overall_attendance_pct" in data

    @pytest.mark.asyncio
    async def test_by_date(self, client: AsyncClient, auth_headers):
        resp = await client.get("/api/dashboard/by-date", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    @pytest.mark.asyncio
    async def test_by_section(self, client: AsyncClient, auth_headers):
        resp = await client.get("/api/dashboard/by-section", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    @pytest.mark.asyncio
    async def test_at_risk(self, client: AsyncClient, auth_headers):
        resp = await client.get("/api/dashboard/at-risk", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    @pytest.mark.asyncio
    async def test_heatmap(self, client: AsyncClient, auth_headers):
        resp = await client.get("/api/dashboard/heatmap", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data

    @pytest.mark.asyncio
    async def test_stats_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/dashboard/stats")
        assert resp.status_code == 401
