from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app import models, schemas, utils

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.UserRead)
async def register(payload: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.User).where(models.User.username == payload.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    result = await db.execute(select(models.User).where(models.User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        username=payload.username,
        email=payload.email,
        password_hash=utils.hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    await utils.audit_log(db, user.id, "register", "user", user.id, {"username": user.username})
    return user


@router.post("/login", response_model=schemas.Token)
async def login(payload: schemas.UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.User).where(models.User.username == payload.username))
    user = result.scalar_one_or_none()
    if not user or not utils.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = utils.create_access_token({"sub": user.id, "role": user.role.value})
    return schemas.Token(
        access_token=token,
        user=schemas.UserRead.model_validate(user),
    )


@router.get("/me", response_model=schemas.UserRead)
async def get_me(current_user: models.User = Depends(utils.get_current_user)):
    return current_user
