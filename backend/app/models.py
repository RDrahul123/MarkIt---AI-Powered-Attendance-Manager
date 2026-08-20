import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date,
    ForeignKey, Enum, JSON, Text, func
)
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    teacher = "teacher"
    ta = "ta"
    viewer = "viewer"


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    late = "late"
    excused = "excused"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.teacher)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    audit_logs = relationship("AuditLog", back_populates="user")
    ai_prompts = relationship("AiPromptHistory", back_populates="user")


class AcademicYear(Base):
    __tablename__ = "academic_years"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    is_active = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    sections = relationship("Section", back_populates="academic_year")
    students = relationship("Student", back_populates="academic_year")


class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)

    academic_year = relationship("AcademicYear", back_populates="sections")
    subjects = relationship("Subject", back_populates="section")
    students = relationship("Student", back_populates="section")
    teacher_assignments = relationship("TeacherAssignment", back_populates="section")
    ai_prompts = relationship("AiPromptHistory", back_populates="section")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)

    section = relationship("Section", back_populates="subjects")
    teacher_assignments = relationship("TeacherAssignment", back_populates="subject")
    attendance_records = relationship("Attendance", back_populates="subject")
    ai_prompts = relationship("AiPromptHistory", back_populates="subject")


class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    email = Column(String(255), nullable=False)

    assignments = relationship("TeacherAssignment", back_populates="teacher")


class TeacherAssignment(Base):
    __tablename__ = "teacher_assignments"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)

    teacher = relationship("Teacher", back_populates="assignments")
    subject = relationship("Subject", back_populates="teacher_assignments")
    section = relationship("Section", back_populates="teacher_assignments")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    roll_no = Column(String(50), nullable=False)
    name = Column(String(200), nullable=False)
    email = Column(String(255), nullable=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)

    section = relationship("Section", back_populates="students")
    academic_year = relationship("AcademicYear", back_populates="students")
    attendance_records = relationship("Attendance", back_populates="student")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(Enum(AttendanceStatus), nullable=False)
    marked_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc), nullable=False)

    student = relationship("Student", back_populates="attendance_records")
    subject = relationship("Subject", back_populates="attendance_records")
    marker = relationship("User")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(Integer, nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="audit_logs")


class AiPromptHistory(Base):
    __tablename__ = "ai_prompt_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    prompt = Column(Text, nullable=False)
    response = Column(Text, nullable=True)
    provider = Column(String(50), nullable=False)
    model = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="ai_prompts")
    section = relationship("Section", back_populates="ai_prompts")
    subject = relationship("Subject", back_populates="ai_prompts")
