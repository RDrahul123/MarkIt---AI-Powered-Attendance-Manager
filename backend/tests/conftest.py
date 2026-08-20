import os
import tempfile

_test_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_test_db.close()
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_test_db.name}"
os.environ["SECRET_KEY"] = "test-secret-key"

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import Base, engine, async_session, get_db
from app import models, utils


@pytest.fixture(scope="session", autouse=True)
async def create_test_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest.fixture
async def db():
    async with async_session() as session:
        yield session
        await session.rollback()


@pytest.fixture(scope="session")
def app():
    from app.main import app as fastapi_app
    return fastapi_app


@pytest.fixture
async def client(app, db):
    app.dependency_overrides[get_db] = lambda: db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def seed_data(db):
    tables = [
        models.Attendance.__table__,
        models.Student.__table__,
        models.Subject.__table__,
        models.Section.__table__,
        models.AcademicYear.__table__,
        models.User.__table__,
        models.AuditLog.__table__,
        models.AiPromptHistory.__table__,
        models.TeacherAssignment.__table__,
        models.Teacher.__table__,
    ]
    for t in tables:
        await db.execute(delete(t))
    await db.commit()

    admin = models.User(
        username="admin",
        email="admin@markit.local",
        password_hash=utils.hash_password("admin123"),
        role=models.UserRole.admin,
    )
    db.add(admin)
    await db.flush()

    year = models.AcademicYear(name="2025-2026", is_active=True)
    db.add(year)
    await db.flush()

    section = models.Section(name="Section A", academic_year_id=year.id)
    db.add(section)
    await db.flush()

    for code, name in [("CS101", "Data Structures"), ("CS102", "Operating Systems")]:
        db.add(models.Subject(code=code, name=name, section_id=section.id))
    await db.flush()

    for roll, name in [("1", "Student One"), ("2", "Student Two")]:
        db.add(models.Student(
            roll_no=roll, name=name, email=f"{name.lower().replace(' ', '')}@edu.in",
            section_id=section.id, academic_year_id=year.id,
        ))

    await db.commit()
    return {
        "admin": admin,
        "year": year,
        "section": section,
    }


@pytest.fixture
async def auth_headers(db, seed_data):
    user = models.User(
        username="testadmin",
        email="testadmin@test.com",
        password_hash=utils.hash_password("admin123"),
        role=models.UserRole.admin,
    )
    db.add(user)
    await db.commit()
    token = utils.create_access_token({"sub": user.id, "role": user.role.value})
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture
async def teacher_headers(db, seed_data):
    user = models.User(
        username="testteacher",
        email="testteacher@test.com",
        password_hash=utils.hash_password("teacher123"),
        role=models.UserRole.teacher,
    )
    db.add(user)
    await db.commit()
    token = utils.create_access_token({"sub": user.id, "role": user.role.value})
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
