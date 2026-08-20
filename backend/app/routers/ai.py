import json
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app import models, schemas, utils

router = APIRouter(prefix="/api/ai", tags=["ai"])


async def build_attendance_context(
    db: AsyncSession, section_id: int | None, subject_id: int | None
) -> str:
    if not section_id:
        return ""

    students_r = await db.execute(
        select(models.Student).where(models.Student.section_id == section_id)
    )
    students = students_r.scalars().all()
    if not students:
        return "No students in this section."

    lines = [f"Section has {len(students)} students."]

    if subject_id:
        stu_ids = [s.id for s in students]
        att_r = await db.execute(
            select(models.Attendance).where(
                models.Attendance.subject_id == subject_id,
                models.Attendance.student_id.in_(stu_ids),
            )
        )
        records = att_r.scalars().all()
        total = len(records)
        present = sum(1 for r in records if r.status == models.AttendanceStatus.present)
        absent = sum(1 for r in records if r.status == models.AttendanceStatus.absent)
        late = sum(1 for r in records if r.status == models.AttendanceStatus.late)
        excused = sum(1 for r in records if r.status == models.AttendanceStatus.excused)
        lines.append(
            f"Subject attendance: {total} records. "
            f"Present={present}, Absent={absent}, Late={late}, Excused={excused}."
        )
        if total > 0:
            lines.append(f"Overall attendance rate: {round((present+late)/total*100, 1)}%")

        # at-risk
        at_risk = []
        for s in students:
            sr = await db.execute(
                select(models.Attendance).where(
                    models.Attendance.student_id == s.id,
                    models.Attendance.subject_id == subject_id,
                )
            )
            srecs = sr.scalars().all()
            stotal = len(srecs)
            sp = sum(1 for r in srecs if r.status == models.AttendanceStatus.present or r.status == models.AttendanceStatus.late)
            if stotal > 0 and (sp / stotal * 100) < 75:
                at_risk.append(f"{s.name} ({s.roll_no}): {round(sp/stotal*100,1)}%")
        if at_risk:
            lines.append("At-risk students (<75%): " + "; ".join(at_risk[:20]))

    return "\n".join(lines)


async def call_openai(api_key: str, model: str, prompt: str) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": model, "messages": [{"role": "user", "content": prompt}]},
        )
        if r.status_code != 200:
            raise HTTPException(status_code=r.status_code, detail=r.text)
        return r.json()["choices"][0]["message"]["content"]


async def call_anthropic(api_key: str, model: str, prompt: str) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "max_tokens": 4096,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        if r.status_code != 200:
            raise HTTPException(status_code=r.status_code, detail=r.text)
        data = r.json()
        return data["content"][0]["text"]


async def call_gemini(api_key: str, model: str, prompt: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            url,
            headers={"Content-Type": "application/json"},
            json={"contents": [{"parts": [{"text": prompt}]}]},
        )
        if r.status_code != 200:
            raise HTTPException(status_code=r.status_code, detail=r.text)
        data = r.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]


async def call_ollama(model: str, prompt: str) -> str:
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(
            "http://localhost:11434/api/generate",
            json={"model": model, "prompt": prompt, "stream": False},
        )
        if r.status_code != 200:
            raise HTTPException(status_code=r.status_code, detail=r.text)
        return r.json()["response"]


async def call_custom(api_url: str, prompt: str) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            api_url,
            headers={"Content-Type": "application/json"},
            json={"prompt": prompt},
        )
        if r.status_code != 200:
            raise HTTPException(status_code=r.status_code, detail=r.text)
        data = r.json()
        return data.get("response") or data.get("text") or json.dumps(data)


@router.post("/", response_model=schemas.AIResponse)
async def ai_chat(
    payload: schemas.AIRequest,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user),
):
    context = await build_attendance_context(db, payload.section_id, payload.subject_id)
    full_prompt = f"{context}\n\n{payload.prompt}" if context else payload.prompt

    provider = payload.provider.lower()
    try:
        if provider == "openai":
            api_key = payload.api_key or ""
            resp = await call_openai(api_key, payload.model, full_prompt)
        elif provider == "anthropic":
            api_key = payload.api_key or ""
            resp = await call_anthropic(api_key, payload.model, full_prompt)
        elif provider == "gemini":
            api_key = payload.api_key or ""
            resp = await call_gemini(api_key, payload.model, full_prompt)
        elif provider == "ollama":
            resp = await call_ollama(payload.model, full_prompt)
        elif provider == "custom":
            resp = await call_custom(payload.api_url or "", full_prompt)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Provider error: {str(e)}")

    history = models.AiPromptHistory(
        user_id=current_user.id,
        section_id=payload.section_id,
        subject_id=payload.subject_id,
        prompt=payload.prompt,
        response=resp,
        provider=provider,
        model=payload.model,
    )
    db.add(history)
    await db.commit()
    await db.refresh(history)

    return schemas.AIResponse(
        response=resp,
        provider=provider,
        model=payload.model,
        history_id=history.id,
    )
