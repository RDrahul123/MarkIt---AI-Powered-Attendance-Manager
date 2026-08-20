import pytest
from httpx import AsyncClient
from app import models
from app.database import async_session
from app import utils


class TestAudit:
    @pytest.mark.asyncio
    async def test_list_audit_logs(self, client: AsyncClient, auth_headers):
        resp = await client.get("/api/audit/", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    @pytest.mark.asyncio
    async def test_audit_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/audit/")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_create_student_creates_audit(self, client: AsyncClient, auth_headers):
        resp = await client.post("/api/students/", headers=auth_headers, json={
            "roll_no": "AUD001",
            "name": "Audit Test",
            "email": "aud@edu.in",
            "section_id": 1,
            "academic_year_id": 1,
        })
        assert resp.status_code == 200
        student_id = resp.json()["id"]

        resp = await client.get("/api/audit/?entity_type=student", headers=auth_headers)
        assert resp.status_code == 200
        logs = resp.json()
        student_logs = [l for l in logs if l.get("entity_id") == student_id]
        assert len(student_logs) > 0
        assert student_logs[0]["action"] == "create"
