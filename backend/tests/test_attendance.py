import pytest
from httpx import AsyncClient
from app import models
from app.database import async_session


class TestAttendance:
    @pytest.mark.asyncio
    async def test_mark_attendance(self, client: AsyncClient, auth_headers):
        resp = await client.post("/api/attendance/mark", headers=auth_headers, json={
            "student_id": 1,
            "subject_id": 1,
            "date": "2025-08-20",
            "status": "present",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "present"

    @pytest.mark.asyncio
    async def test_mark_attendance_invalid_student(self, client: AsyncClient, auth_headers):
        resp = await client.post("/api/attendance/mark", headers=auth_headers, json={
            "student_id": 99999,
            "subject_id": 1,
            "date": "2025-08-20",
            "status": "present",
        })
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_bulk_mark_attendance(self, client: AsyncClient, auth_headers):
        resp = await client.post("/api/attendance/bulk", headers=auth_headers, json={
            "marks": [
                {"student_id": 1, "subject_id": 1, "date": "2025-08-21", "status": "present"},
                {"student_id": 2, "subject_id": 1, "date": "2025-08-21", "status": "absent"},
            ],
        })
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    @pytest.mark.asyncio
    async def test_list_attendance(self, client: AsyncClient, auth_headers):
        resp = await client.get("/api/attendance/?subject_id=1&start_date=2025-08-01&end_date=2025-12-31", headers=auth_headers)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_attendance_summary(self, client: AsyncClient, auth_headers):
        resp = await client.get("/api/attendance/summary/1/1", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) > 0
        for s in data:
            assert "percentage" in s
            assert "present" in s
            assert "absent" in s

    @pytest.mark.asyncio
    async def test_attendance_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/attendance/?subject_id=1")
        assert resp.status_code == 401
