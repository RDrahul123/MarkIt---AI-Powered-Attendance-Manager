from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=schemas.DashboardStats)
async def overall_stats(db: AsyncSession = Depends(get_db)):
    total_students = (await db.execute(select(func.count(models.Student.id)))).scalar() or 0
    total_sections = (await db.execute(select(func.count(models.Section.id)))).scalar() or 0
    total_subjects = (await db.execute(select(func.count(models.Subject.id)))).scalar() or 0
    total_att = (await db.execute(select(func.count(models.Attendance.id)))).scalar() or 0

    present_count = (
        await db.execute(
            select(func.count(models.Attendance.id)).where(
                models.Attendance.status.in_([
                    models.AttendanceStatus.present,
                    models.AttendanceStatus.late,
                ])
            )
        )
    ).scalar() or 0

    pct = round(present_count / total_att * 100, 2) if total_att > 0 else 0.0

    return schemas.DashboardStats(
        total_students=total_students,
        total_sections=total_sections,
        total_subjects=total_subjects,
        total_attendance_records=total_att,
        overall_attendance_pct=pct,
    )


@router.get("/by-date")
async def attendance_by_date(
    subject_id: Optional[int] = Query(None),
    section_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(
        models.Attendance.date,
        func.count(models.Attendance.id).label("total"),
        func.sum(case((models.Attendance.status == models.AttendanceStatus.present, 1), else_=0)).label("present"),
        func.sum(case((models.Attendance.status == models.AttendanceStatus.absent, 1), else_=0)).label("absent"),
        func.sum(case((models.Attendance.status == models.AttendanceStatus.late, 1), else_=0)).label("late"),
        func.sum(case((models.Attendance.status == models.AttendanceStatus.excused, 1), else_=0)).label("excused"),
    )

    if subject_id:
        q = q.where(models.Attendance.subject_id == subject_id)

    if section_id:
        student_ids = select(models.Student.id).where(models.Student.section_id == section_id)
        q = q.where(models.Attendance.student_id.in_(student_ids))

    q = q.group_by(models.Attendance.date).order_by(models.Attendance.date)
    result = await db.execute(q)
    rows = result.all()

    return [
        {
            "date": r.date.isoformat(),
            "total": r.total,
            "present": int(r.present or 0),
            "absent": int(r.absent or 0),
            "late": int(r.late or 0),
            "excused": int(r.excused or 0),
        }
        for r in rows
    ]


@router.get("/by-section")
async def attendance_by_section(db: AsyncSession = Depends(get_db)):
    q = (
        select(
            models.Section.id,
            models.Section.name,
            func.count(models.Attendance.id).label("total"),
            func.sum(case((models.Attendance.status == models.AttendanceStatus.present, 1), else_=0)).label("present"),
            func.sum(case((models.Attendance.status == models.AttendanceStatus.absent, 1), else_=0)).label("absent"),
        )
        .join(models.Student, models.Student.section_id == models.Section.id)
        .join(models.Attendance, models.Attendance.student_id == models.Student.id)
        .group_by(models.Section.id, models.Section.name)
    )
    result = await db.execute(q)
    rows = result.all()

    return [
        {
            "section_id": r.id,
            "section_name": r.name,
            "total": r.total,
            "present": int(r.present or 0),
            "absent": int(r.absent or 0),
            "percentage": round((int(r.present or 0) / r.total * 100), 2) if r.total > 0 else 0,
        }
        for r in rows
    ]


@router.get("/at-risk", response_model=list[schemas.AtRiskStudent])
async def at_risk_students(
    threshold: float = Query(75.0),
    subject_id: Optional[int] = Query(None),
    section_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(
            models.Student.id,
            models.Student.name,
            models.Student.roll_no,
            models.Section.name.label("section_name"),
            func.count(models.Attendance.id).label("total"),
            func.sum(case((models.Attendance.status == models.AttendanceStatus.absent, 1), else_=0)).label("absent_count"),
            func.sum(case((models.Attendance.status.in_([
                models.AttendanceStatus.present, models.AttendanceStatus.late
            ]), 1), else_=0)).label("present_count"),
        )
        .join(models.Section, models.Section.id == models.Student.section_id)
        .join(models.Attendance, models.Attendance.student_id == models.Student.id)
    )

    if subject_id:
        q = q.where(models.Attendance.subject_id == subject_id)
    if section_id:
        q = q.where(models.Student.section_id == section_id)

    q = q.group_by(models.Student.id, models.Student.name, models.Student.roll_no, models.Section.name)
    result = await db.execute(q)
    rows = result.all()

    at_risk = []
    for r in rows:
        if r.total > 0:
            pct = round((r.present_count / r.total) * 100, 2)
            if pct < threshold:
                at_risk.append(schemas.AtRiskStudent(
                    student_id=r.id,
                    student_name=r.name,
                    roll_no=r.roll_no,
                    section_name=r.section_name,
                    attendance_pct=pct,
                    total_sessions=r.total,
                    absent_count=int(r.absent_count or 0),
                ))

    at_risk.sort(key=lambda x: x.attendance_pct)
    return at_risk


@router.get("/heatmap", response_model=schemas.HeatmapData)
async def heatmap_data(
    subject_id: Optional[int] = Query(None),
    section_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(
            models.Attendance.date,
            func.sum(case((models.Attendance.status == models.AttendanceStatus.present, 1), else_=0)).label("present"),
            func.sum(case((models.Attendance.status == models.AttendanceStatus.absent, 1), else_=0)).label("absent"),
            func.sum(case((models.Attendance.status == models.AttendanceStatus.late, 1), else_=0)).label("late"),
            func.sum(case((models.Attendance.status == models.AttendanceStatus.excused, 1), else_=0)).label("excused"),
        )
    )

    if subject_id:
        q = q.where(models.Attendance.subject_id == subject_id)
    if section_id:
        student_ids = select(models.Student.id).where(models.Student.section_id == section_id)
        q = q.where(models.Attendance.student_id.in_(student_ids))

    q = q.group_by(models.Attendance.date).order_by(models.Attendance.date)
    result = await db.execute(q)
    rows = result.all()

    data = [
        schemas.HeatmapDay(
            date=r.date.isoformat(),
            present=int(r.present or 0),
            absent=int(r.absent or 0),
            late=int(r.late or 0),
            excused=int(r.excused or 0),
        )
        for r in rows
    ]

    return schemas.HeatmapData(
        subject_id=subject_id,
        section_id=section_id,
        data=data,
    )
