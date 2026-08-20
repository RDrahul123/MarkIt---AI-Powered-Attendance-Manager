export type UserRole = "admin" | "teacher" | "ta" | "viewer";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type AIProvider = "openai" | "anthropic" | "gemini" | "ollama" | "custom";

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface AcademicYear {
  id: number;
  name: string;
  is_active: boolean;
}

export interface Section {
  id: number;
  name: string;
  academic_year_id: number;
}

export interface Subject {
  id: number;
  code: string;
  name: string;
  section_id: number;
}

export interface Teacher {
  id: number;
  name: string;
  email: string;
  user_id: number;
}

export interface Student {
  id: number;
  roll_no: string;
  name: string;
  email: string;
  section_id: number;
  academic_year_id: number;
}

export interface Attendance {
  id: number;
  student_id: number;
  subject_id: number;
  date: string;
  status: AttendanceStatus;
  marked_by: number;
  created_at: string;
}

export interface AttendanceSummary {
  student_id: number;
  student_name: string;
  roll_no: string;
  total_sessions: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

export interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  details: any;
  created_at: string;
}

export interface AiPromptHistory {
  id: number;
  prompt: string;
  response: string;
  provider: string;
  model: string;
  section_id: number;
  created_at: string;
}

export interface DashboardStats {
  total_students: number;
  total_sections: number;
  total_subjects: number;
  total_attendance_records: number;
  overall_attendance_pct: number;
}

export interface HeatmapData {
  day: string;
  hour: number;
  count: number;
}
