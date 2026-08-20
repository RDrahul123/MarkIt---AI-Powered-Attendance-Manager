import pytest
from httpx import AsyncClient


class TestExport:
    @pytest.mark.asyncio
    async def test_export_excel(self, client: AsyncClient, auth_headers):
        resp = await client.get(
            "/api/export/excel?section_id=1&subject_id=1&start_date=2025-08-01&end_date=2025-12-31",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert "application/vnd.openxmlformats" in resp.headers["content-type"]

    @pytest.mark.asyncio
    async def test_backup(self, client: AsyncClient, auth_headers):
        resp = await client.get("/api/export/backup", headers=auth_headers)
        assert resp.status_code == 200
        assert "application/json" in resp.headers["content-type"]

    @pytest.mark.asyncio
    async def test_backup_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/export/backup")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_export_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/export/excel?section_id=1&subject_id=1")
        assert resp.status_code == 401