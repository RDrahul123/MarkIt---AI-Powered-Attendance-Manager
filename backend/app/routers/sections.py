from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app import models, schemas, utils

router = APIRouter(prefix="/api/sections", tags=["sections"])


# ── Academic Years ──

@router.get("/years", response_model=list[schemas.AcademicYearRead])
async def list_years(
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(utils.get_current_user),
):
    result = await db.execute(select(models.AcademicYear).order_by(models.AcademicYear.name))
    return result.scalars().all()


@router.post("/years", response_model=schemas.AcademicYearRead)
async def create_year(
    payload: schemas.AcademicYearCreate,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(utils.get_current_user),
):
    year = models.AcademicYear(**payload.model_dump())
    db.add(year)
    await db.commit()
    await db.refresh(year)
    await utils.audit_log(db, user.id, "create", "academic_year", year.id, payload.model_dump())
    return year


@router.put("/years/{year_id}", response_model=schemas.AcademicYearRead)
async def update_year(
    year_id: int,
    payload: schemas.AcademicYearCreate,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(utils.get_current_user),
):
    result = await db.execute(select(models.AcademicYear).where(models.AcademicYear.id == year_id))
    year = result.scalar_one_or_none()
    if not year:
        raise HTTPException(status_code=404, detail="Academic year not found")
    old_data = {c.name: getattr(year, c.name) for c in year.__table__.columns}
    if payload.is_active:
        from sqlalchemy import update
        await db.execute(
            update(models.AcademicYear).values(is_active=False)
        )
    for k, v in payload.model_dump().items():
        setattr(year, k, v)
    await db.commit()
    await db.refresh(year)
    await utils.audit_log(db, user.id, "update", "academic_year", year_id, {"old": old_data, "new": payload.model_dump()})
    return year


@router.delete("/years/{year_id}")
async def delete_year(
    year_id: int,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(utils.get_current_user),
):
    result = await db.execute(select(models.AcademicYear).where(models.AcademicYear.id == year_id))
    year = result.scalar_one_or_none()
    if not year:
        raise HTTPException(status_code=404, detail="Academic year not found")
    await db.delete(year)
    await db.commit()
    await utils.audit_log(db, user.id, "delete", "academic_year", year_id, {"name": year.name})
    return {"detail": "Deleted"}


# ── Sections ──

@router.get("/", response_model=list[schemas.SectionRead])
async def list_sections(
    academic_year_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(utils.get_current_user),
):
    q = select(models.Section)
    if academic_year_id is not None:
        q = q.where(models.Section.academic_year_id == academic_year_id)
    result = await db.execute(q.order_by(models.Section.name))
    return result.scalars().all()


@router.post("/", response_model=schemas.SectionRead)
async def create_section(
    payload: schemas.SectionCreate,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(utils.get_current_user),
):
    result = await db.execute(
        select(models.AcademicYear).where(models.AcademicYear.id == payload.academic_year_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Academic year not found")
    section = models.Section(**payload.model_dump())
    db.add(section)
    await db.commit()
    await db.refresh(section)
    await utils.audit_log(db, user.id, "create", "section", section.id, payload.model_dump())
    return section


@router.put("/{section_id}", response_model=schemas.SectionRead)
async def update_section(
    section_id: int,
    payload: schemas.SectionCreate,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(utils.get_current_user),
):
    result = await db.execute(select(models.Section).where(models.Section.id == section_id))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    old_data = {c.name: getattr(section, c.name) for c in section.__table__.columns}
    for k, v in payload.model_dump().items():
        setattr(section, k, v)
    await db.commit()
    await db.refresh(section)
    await utils.audit_log(db, user.id, "update", "section", section_id, {"old": old_data, "new": payload.model_dump()})
    return section


@router.delete("/{section_id}")
async def delete_section(
    section_id: int,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(utils.get_current_user),
):
    result = await db.execute(select(models.Section).where(models.Section.id == section_id))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    await db.delete(section)
    await db.commit()
    await utils.audit_log(db, user.id, "delete", "section", section_id, {"name": section.name})
    return {"detail": "Deleted"}


# ── Subjects ──

@router.get("/subjects/", response_model=list[schemas.SubjectRead])
async def list_subjects(
    section_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(utils.get_current_user),
):
    q = select(models.Subject)
    if section_id is not None:
        q = q.where(models.Subject.section_id == section_id)
    result = await db.execute(q.order_by(models.Subject.code))
    return result.scalars().all()


@router.post("/subjects/", response_model=schemas.SubjectRead)
async def create_subject(
    payload: schemas.SubjectCreate,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(utils.get_current_user),
):
    result = await db.execute(select(models.Section).where(models.Section.id == payload.section_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Section not found")
    subj = models.Subject(**payload.model_dump())
    db.add(subj)
    await db.commit()
    await db.refresh(subj)
    await utils.audit_log(db, user.id, "create", "subject", subj.id, payload.model_dump())
    return subj


@router.put("/subjects/{subject_id}", response_model=schemas.SubjectRead)
async def update_subject(
    subject_id: int,
    payload: schemas.SubjectCreate,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(utils.get_current_user),
):
    result = await db.execute(select(models.Subject).where(models.Subject.id == subject_id))
    subj = result.scalar_one_or_none()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    old_data = {c.name: getattr(subj, c.name) for c in subj.__table__.columns}
    for k, v in payload.model_dump().items():
        setattr(subj, k, v)
    await db.commit()
    await db.refresh(subj)
    await utils.audit_log(db, user.id, "update", "subject", subject_id, {"old": old_data, "new": payload.model_dump()})
    return subj


@router.delete("/subjects/{subject_id}")
async def delete_subject(
    subject_id: int,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(utils.get_current_user),
):
    result = await db.execute(select(models.Subject).where(models.Subject.id == subject_id))
    subj = result.scalar_one_or_none()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    await db.delete(subj)
    await db.commit()
    await utils.audit_log(db, user.id, "delete", "subject", subject_id, {"code": subj.code, "name": subj.name})
    return {"detail": "Deleted"}


# ── Teacher Assignments ──

@router.get("/assignments/", response_model=list[schemas.TeacherAssignmentRead])
async def list_assignments(
    section_id: int | None = None,
    teacher_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(utils.get_current_user),
):
    q = select(models.TeacherAssignment)
    if section_id is not None:
        q = q.where(models.TeacherAssignment.section_id == section_id)
    if teacher_id is not None:
        q = q.where(models.TeacherAssignment.teacher_id == teacher_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/assignments/", response_model=schemas.TeacherAssignmentRead)
async def create_assignment(
    payload: schemas.TeacherAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(utils.get_current_user),
):
    assign = models.TeacherAssignment(**payload.model_dump())
    db.add(assign)
    await db.commit()
    await db.refresh(assign)
    await utils.audit_log(db, user.id, "create", "teacher_assignment", assign.id, payload.model_dump())
    return assign


@router.delete("/assignments/{assignment_id}")
async def delete_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(utils.get_current_user),
):
    result = await db.execute(
        select(models.TeacherAssignment).where(models.TeacherAssignment.id == assignment_id)
    )
    assign = result.scalar_one_or_none()
    if not assign:
        raise HTTPException(status_code=404, detail="Assignment not found")
    await db.delete(assign)
    await db.commit()
    await utils.audit_log(db, user.id, "delete", "teacher_assignment", assignment_id, {"teacher_id": assign.teacher_id, "subject_id": assign.subject_id, "section_id": assign.section_id})
    return {"detail": "Deleted"}
