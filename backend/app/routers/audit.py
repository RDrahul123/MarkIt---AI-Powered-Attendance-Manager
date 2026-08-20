from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app import models, schemas, utils

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("/", response_model=list[schemas.AuditLogRead])
async def list_audit_logs(
    user_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user),
):
    q = select(models.AuditLog)
    if user_id is not None:
        q = q.where(models.AuditLog.user_id == user_id)
    elif current_user.role != models.UserRole.admin:
        q = q.where(models.AuditLog.user_id == current_user.id)
    if action is not None:
        q = q.where(models.AuditLog.action == action)
    if entity_type is not None:
        q = q.where(models.AuditLog.entity_type == entity_type)

    q = q.order_by(models.AuditLog.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()
