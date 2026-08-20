from datetime import date, datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app import models, schemas, utils

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


@router.post("/mark", response_model=schemas.AttendanceRead)
async def mark_attendance(
    payload: schemas.AttendanceMark,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(utils.get_current_user),
):
    result = await db.execute(select(models.Student).where(models.Student.id == payload.student_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Student not found")
    result = await db.execute(select(models.Subject).where(models.Subject.id == payload.subject_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Subject not found")

    existing = await db.execute(
        select(models.Attendance).where(
            models.Attendance.student_id == payload.student_id,
            models.Attendance.subject_id == payload.subject_id,
            models.Attendance.date == payload.date,
        )
    )
    existing_rec = existing.scalar_one_or_none()

    if existing_rec:
        existing_rec.status = payload.status
        existing_rec.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(existing_rec)
        await utils.audit_log(
            db, user.id, "update_attendance", "attendance", existing_rec.id,
            {"status": payload.status.value},
        )
        return existing_rec

    rec = models.Attendance(
        student_id=payload.student_id,
        subject_id=payload.subject_id,
        date=payload.date,
        status=payload.status,
        marked_by=user.id,
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    await utils.audit_log(db, user.id, "mark_attendance", "attendance", rec.id, {"status": payload.status.value})
    return rec


@router.post("/bulk", response_model=list[schemas.AttendanceRead])
async def bulk_mark(
    payload: schemas.AttendanceBulkMark,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(utils.get_current_user),
):
    results: list[models.Attendance] = []
    for m in payload.marks:
        existing = await db.execute(
            select(models.Attendance).where(
                models.Attendance.student_id == m.student_id,
                models.Attendance.subject_id == m.subject_id,
                models.Attendance.date == m.date,
            )
        )
        existing_rec = existing.scalar_one_or_none()
        if existing_rec:
            existing_rec.status = m.status
            existing_rec.updated_at = datetime.now(timezone.utc)
            await db.refresh(existing_rec)
            results.append(existing_rec)
        else:
            rec = models.Attendance(
                student_id=m.student_id,
                subject_id=m.subject_id,
                date=m.date,
                status=m.status,
                marked_by=user.id,
            )
            db.add(rec)
            await db.flush()
            await db.refresh(rec)
            results.append(rec)
    await db.commit()
    return results


@router.get("/", response_model=list[schemas.AttendanceRead])
async def list_attendance(
    section_id: Optional[int] = Query(None),
    subject_id: Optional[int] = Query(None),
    student_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[models.AttendanceStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(utils.get_current_user),
):
    q = select(models.Attendance)
    if subject_id is not None:
        q = q.where(models.Attendance.subject_id == subject_id)
    if student_id is not None:
        q = q.where(models.Attendance.student_id == student_id)
    if start_date is not None:
        q = q.where(models.Attendance.date >= start_date)
    if end_date is not None:
        q = q.where(models.Attendance.date <= end_date)
    if status is not None:
        q = q.where(models.Attendance.status == status)

    if section_id is not None:
        student_ids = select(models.Student.id).where(models.Student.section_id == section_id)
        q = q.where(models.Attendance.student_id.in_(student_ids))

    result = await db.execute(q.order_by(models.Attendance.date.desc()))
    return result.scalars().all()


@router.get("/by-date")
async def attendance_by_date(
    subject_id: int = Query(...),
    date_val: date = Query(..., alias="date"),
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(utils.get_current_user),
):
    result = await db.execute(
        select(models.Attendance)
        .where(models.Attendance.subject_id == subject_id, models.Attendance.date == date_val)
    )
    return result.scalars().all()


@router.get("/summary/{section_id}/{subject_id}", response_model=list[schemas.AttendanceSummary])
async def student_summary(
    section_id: int,
    subject_id: int,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(utils.get_current_user),
):
    students = await db.execute(
        select(models.Student).where(models.Student.section_id == section_id)
    )
    student_list = students.scalars().all()
    summaries: list[schemas.AttendanceSummary] = []

    for s in student_list:
        q = select(models.Attendance).where(
            models.Attendance.student_id == s.id,
            models.Attendance.subject_id == subject_id,
        )
        if start_date:
            q = q.where(models.Attendance.date >= start_date)
        if end_date:
            q = q.where(models.Attendance.date <= end_date)

        records = (await db.execute(q)).scalars().all()
        total = len(records)
        present = sum(1 for r in records if r.status == models.AttendanceStatus.present)
        absent = sum(1 for r in records if r.status == models.AttendanceStatus.absent)
        late = sum(1 for r in records if r.status == models.AttendanceStatus.late)
        excused = sum(1 for r in records if r.status == models.AttendanceStatus.excused)
        pct = round((present + late) / total * 100, 2) if total > 0 else 0.0

        summaries.append(schemas.AttendanceSummary(
            student_id=s.id,
            student_name=s.name,
            roll_no=s.roll_no,
            total_sessions=total,
            present=present,
            absent=absent,
            late=late,
            excused=excused,
            percentage=pct,
        ))

    return summaries
