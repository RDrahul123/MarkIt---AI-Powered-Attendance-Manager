from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from app.models import UserRole, AttendanceStatus


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: UserRole = UserRole.teacher


class UserRead(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    created_at: datetime

    model_config = {"from_attributes": True}


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class AcademicYearCreate(BaseModel):
    name: str
    is_active: bool = False


class AcademicYearRead(BaseModel):
    id: int
    name: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SectionCreate(BaseModel):
    name: str
    academic_year_id: int


class SectionRead(BaseModel):
    id: int
    name: str
    academic_year_id: int

    model_config = {"from_attributes": True}


class SubjectCreate(BaseModel):
    code: str
    name: str
    section_id: int


class SubjectRead(BaseModel):
    id: int
    code: str
    name: str
    section_id: int

    model_config = {"from_attributes": True}


class TeacherCreate(BaseModel):
    user_id: int
    name: str
    email: str


class TeacherRead(BaseModel):
    id: int
    user_id: int
    name: str
    email: str

    model_config = {"from_attributes": True}


class TeacherAssignmentCreate(BaseModel):
    teacher_id: int
    subject_id: int
    section_id: int


class TeacherAssignmentRead(BaseModel):
    id: int
    teacher_id: int
    subject_id: int
    section_id: int

    model_config = {"from_attributes": True}


class StudentCreate(BaseModel):
    roll_no: str
    name: str
    email: Optional[str] = None
    section_id: int
    academic_year_id: int


class StudentRead(BaseModel):
    id: int
    roll_no: str
    name: str
    email: Optional[str]
    section_id: int
    academic_year_id: int

    model_config = {"from_attributes": True}


class StudentBulkItem(BaseModel):
    roll_no: str
    name: str
    email: Optional[str] = None


class StudentImportPreview(BaseModel):
    total_rows: int
    valid_rows: List[StudentBulkItem]
    errors: List[dict]


class AttendanceMark(BaseModel):
    student_id: int
    subject_id: int
    date: date
    status: AttendanceStatus


class AttendanceBulkMark(BaseModel):
    marks: List[AttendanceMark]


class AttendanceRead(BaseModel):
    id: int
    student_id: int
    subject_id: int
    date: date
    status: AttendanceStatus
    marked_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AttendanceSummary(BaseModel):
    student_id: int
    student_name: str
    roll_no: str
    total_sessions: int
    present: int
    absent: int
    late: int
    excused: int
    percentage: float


class ExportRequest(BaseModel):
    section_id: int
    subject_id: int
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class AIRequest(BaseModel):
    prompt: str
    section_id: Optional[int] = None
    subject_id: Optional[int] = None
    provider: str = "openai"
    model: str = "gpt-3.5-turbo"
    api_key: Optional[str] = None
    api_url: Optional[str] = None


class AIResponse(BaseModel):
    response: str
    provider: str
    model: str
    history_id: int


class AuditLogRead(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    entity_type: Optional[str]
    entity_id: Optional[int]
    details: Optional[dict]
    created_at: datetime

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total_students: int
    total_sections: int
    total_subjects: int
    total_attendance_records: int
    overall_attendance_pct: float


class AtRiskStudent(BaseModel):
    student_id: int
    student_name: str
    roll_no: str
    section_name: str
    attendance_pct: float
    total_sessions: int
    absent_count: int


class HeatmapDay(BaseModel):
    date: str
    present: int
    absent: int
    late: int
    excused: int


class HeatmapData(BaseModel):
    subject_id: Optional[int]
    section_id: Optional[int]
    data: List[HeatmapDay]
