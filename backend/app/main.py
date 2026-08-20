import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base, async_session
from app.routers import auth, students, attendance, sections, export, ai, dashboard, audit


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="MarkIt API", version="1.0.0", lifespan=lifespan)

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(attendance.router)
app.include_router(sections.router)
app.include_router(export.router)
app.include_router(ai.router)
app.include_router(dashboard.router)
app.include_router(audit.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/seed")
async def seed_endpoint():
    from sqlalchemy import select
    from app import models, utils

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        result = await db.execute(select(models.User).where(models.User.username == "admin"))
        if result.scalar_one_or_none():
            return {"message": "Seed data already exists."}

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

        subjects_data = [
            ("CS101", "Data Structures"),
            ("CS102", "Operating Systems"),
            ("MA201", "Linear Algebra"),
        ]
        subject_objs = []
        for code, name in subjects_data:
            s = models.Subject(code=code, name=name, section_id=section.id)
            db.add(s)
            subject_objs.append(s)
        await db.flush()

        students_data = [
            ("2025001", "Aarav Sharma", "aarav@edu.in"),
            ("2025002", "Priya Patel", "priya@edu.in"),
            ("2025003", "Rohan Gupta", "rohan@edu.in"),
            ("2025004", "Sneha Reddy", "sneha@edu.in"),
            ("2025005", "Vikram Singh", "vikram@edu.in"),
            ("2025006", "Ananya Nair", "ananya@edu.in"),
            ("2025007", "Karthik Menon", "karthik@edu.in"),
            ("2025008", "Meera Joshi", "meera@edu.in"),
        ]
        student_objs = []
        for roll, name, email in students_data:
            st = models.Student(
                roll_no=roll,
                name=name,
                email=email,
                section_id=section.id,
                academic_year_id=year.id,
            )
            db.add(st)
            student_objs.append(st)
        await db.flush()

        from datetime import date, timedelta
        import random

        base_date = date(2025, 8, 1)
        statuses = list(models.AttendanceStatus)
        weights = [0.7, 0.1, 0.1, 0.1]

        for subj in subject_objs:
            for day_offset in range(0, 40, 1):
                d = base_date + timedelta(days=day_offset)
                if d.weekday() >= 5:
                    continue
                for stu in student_objs:
                    status = random.choices(statuses, weights=weights, k=1)[0]
                    att = models.Attendance(
                        student_id=stu.id,
                        subject_id=subj.id,
                        date=d,
                        status=status,
                        marked_by=admin.id,
                    )
                    db.add(att)

        await db.commit()
        return {"message": "Seed data created successfully!"}


dist_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.isdir(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")


async def seed_data():
    from sqlalchemy import select
    from app import models, utils

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        result = await db.execute(select(models.User).where(models.User.username == "admin"))
        if result.scalar_one_or_none():
            print("Seed data already exists.")
            return

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

        subjects_data = [
            ("CS101", "Data Structures"),
            ("CS102", "Operating Systems"),
            ("MA201", "Linear Algebra"),
        ]
        subject_objs = []
        for code, name in subjects_data:
            s = models.Subject(code=code, name=name, section_id=section.id)
            db.add(s)
            subject_objs.append(s)
        await db.flush()

        students_data = [
            ("2025001", "Aarav Sharma", "aarav@edu.in"),
            ("2025002", "Priya Patel", "priya@edu.in"),
            ("2025003", "Rohan Gupta", "rohan@edu.in"),
            ("2025004", "Sneha Reddy", "sneha@edu.in"),
            ("2025005", "Vikram Singh", "vikram@edu.in"),
            ("2025006", "Ananya Nair", "ananya@edu.in"),
            ("2025007", "Karthik Menon", "karthik@edu.in"),
            ("2025008", "Meera Joshi", "meera@edu.in"),
        ]
        student_objs = []
        for roll, name, email in students_data:
            st = models.Student(
                roll_no=roll,
                name=name,
                email=email,
                section_id=section.id,
                academic_year_id=year.id,
            )
            db.add(st)
            student_objs.append(st)
        await db.flush()

        from datetime import date, timedelta
        import random

        base_date = date(2025, 8, 1)
        statuses = list(models.AttendanceStatus)
        weights = [0.7, 0.1, 0.1, 0.1]

        for subj in subject_objs:
            for day_offset in range(0, 40, 1):
                d = base_date + timedelta(days=day_offset)
                if d.weekday() >= 5:
                    continue
                for stu in student_objs:
                    status = random.choices(statuses, weights=weights, k=1)[0]
                    att = models.Attendance(
                        student_id=stu.id,
                        subject_id=subj.id,
                        date=d,
                        status=status,
                        marked_by=admin.id,
                    )
                    db.add(att)

        await db.commit()
        print("Seed data created successfully!")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "seed":
        asyncio.run(seed_data())
    else:
        import uvicorn
        uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
