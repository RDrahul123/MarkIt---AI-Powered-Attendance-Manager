import pytest
from httpx import AsyncClient
from app import models
from app.database import async_session


class TestStudents:
    @pytest.mark.asyncio
    async def test_list_students(self, client: AsyncClient, auth_headers):
        resp = await client.get("/api/students/?section_id=1", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) > 0
        assert all("roll_no" in s for s in data)

    @pytest.mark.asyncio
    async def test_get_student(self, client: AsyncClient, auth_headers):
        resp = await client.get("/api/students/1", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["roll_no"] is not None

    @pytest.mark.asyncio
    async def test_get_nonexistent_student(self, client: AsyncClient, auth_headers):
        resp = await client.get("/api/students/99999", headers=auth_headers)
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_create_student(self, client: AsyncClient, auth_headers):
        resp = await client.post("/api/students/", headers=auth_headers, json={
            "roll_no": "NEW001",
            "name": "New Student",
            "email": "new@edu.in",
            "section_id": 1,
            "academic_year_id": 1,
        })
        assert resp.status_code == 200
        assert resp.json()["roll_no"] == "NEW001"
        assert resp.json()["name"] == "New Student"

    @pytest.mark.asyncio
    async def test_create_student_invalid_section(self, client: AsyncClient, auth_headers):
        resp = await client.post("/api/students/", headers=auth_headers, json={
            "roll_no": "NEW002",
            "name": "New Student",
            "email": "new2@edu.in",
            "section_id": 99999,
            "academic_year_id": 1,
        })
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_student(self, client: AsyncClient, auth_headers):
        resp = await client.put("/api/students/1", headers=auth_headers, json={
            "roll_no": "UPD001",
            "name": "Updated Name",
            "email": "updated@edu.in",
            "section_id": 1,
            "academic_year_id": 1,
        })
        assert resp.status_code == 200
        assert resp.json()["roll_no"] == "UPD001"

    @pytest.mark.asyncio
    async def test_delete_student(self, client: AsyncClient, auth_headers):
        resp = await client.post("/api/students/", headers=auth_headers, json={
            "roll_no": "DEL001",
            "name": "Delete Me",
            "email": "del@edu.in",
            "section_id": 1,
            "academic_year_id": 1,
        })
        student_id = resp.json()["id"]
        resp = await client.delete(f"/api/students/{student_id}", headers=auth_headers)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_bulk_import_students(self, client: AsyncClient, auth_headers):
        resp = await client.post("/api/students/import", headers=auth_headers, json={
            "students": [
                {"roll_no": "IMP001", "name": "Import 1", "email": "imp1@edu.in"},
                {"roll_no": "IMP002", "name": "Import 2", "email": "imp2@edu.in"},
            ],
            "section_id": 1,
            "academic_year_id": 1,
        })
        assert resp.status_code == 200
        assert len(resp.json()) == 2
