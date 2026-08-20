import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Save, CheckCircle, Wifi, WifiOff } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useAppStore } from "@/store/appStore";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import type { Student, AttendanceStatus } from "@/types";

interface AttendanceRecord {
  student_id: number;
  status: AttendanceStatus | null;
}

const statusColors: Record<AttendanceStatus, string> = {
  present: "bg-green-500 text-white",
  absent: "bg-red-500 text-white",
  late: "bg-yellow-500 text-white",
  excused: "bg-blue-500 text-white",
};

const statusLabels: Record<AttendanceStatus, string> = {
  present: "Present (P)",
  absent: "Absent (A)",
  late: "Late (L)",
  excused: "Excused (E)",
};

const statuses: AttendanceStatus[] = ["present", "absent", "late", "excused"];
const OFFLINE_QUEUE_KEY = "markit-attendance-offline";
const AUTO_SAVE_INTERVAL_KEY = "markit-settings";

export default function AttendancePage() {
  const { apiFetch } = useApi();
  const { selectedSection, selectedSubject } = useAppStore();
  const { addToast } = useToast();

  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [autoSaveInterval, setAutoSaveInterval] = useState(5);

  const fetchData = useCallback(async () => {
    if (!selectedSection || !selectedSubject) {
      setStudents([]);
      setAttendance([]);
      return;
    }
    setLoading(true);
    try {
      const [studentsData, existing] = await Promise.all([
        apiFetch<Student[]>(`/api/students?section_id=${selectedSection}`),
        apiFetch<any[]>(`/api/attendance?section_id=${selectedSection}&subject_id=${selectedSubject}&start_date=${date}&end_date=${date}`),
      ]);
      setStudents(studentsData);
      const attendanceMap = new Map(existing.map((a: any) => [a.student_id, a.status]));
      setAttendance(
        studentsData.map((s) => ({
          student_id: s.id,
          status: attendanceMap.get(s.id) || null,
        }))
      );
    } catch (err: any) {
      addToast(err.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedSection, selectedSubject, date, apiFetch, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const settings = localStorage.getItem(AUTO_SAVE_INTERVAL_KEY);
    if (settings) {
      try {
        const s = JSON.parse(settings);
        setAutoSaveInterval(s.autoSaveInterval || 5);
      } catch { }
    }

    const goOnline = () => {
      setIsOnline(true);
      processOfflineQueue();
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const processOfflineQueue = useCallback(async () => {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
    if (queue.length === 0) return;

    for (const item of queue) {
      try {
        await apiFetch("/api/attendance/bulk", {
          method: "POST",
          body: {
            marks: item.marks.map((m: any) => ({
              student_id: m.student_id,
              subject_id: m.subject_id,
              date: m.date,
              status: m.status,
            })),
          },
        });
      } catch {
        return;
      }
    }
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    addToast("Offline attendance data synced successfully", "success");
  }, [apiFetch, addToast]);

  useEffect(() => {
    if (!hasUnsaved) return;
    const interval = setInterval(() => {
      if (!isOnline || !selectedSubject) {
        const marked = attendance.filter((a) => a.status);
        if (marked.length > 0) {
          const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
          queue.push({
            date,
            subject_id: selectedSubject,
            marks: marked.map((a) => ({
              student_id: a.student_id,
              subject_id: selectedSubject,
              date,
              status: a.status!,
            })),
            timestamp: Date.now(),
          });
          localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(0, 50)));
          setHasUnsaved(false);
          addToast("Saved locally (offline mode)", "info");
        }
        return;
      }
      const marked = attendance.filter((a) => a.status);
      if (marked.length > 0) {
        apiFetch("/api/attendance/bulk", {
          method: "POST",
          body: {
            marks: marked.map((a) => ({
              student_id: a.student_id,
              subject_id: selectedSubject,
              date,
              status: a.status,
            })),
          },
        }).then(() => {
          setAutoSaved(true);
          setTimeout(() => setAutoSaved(false), 3000);
          setHasUnsaved(false);
        }).catch(() => {
          const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
          queue.push({
            date,
            subject_id: selectedSubject,
            marks: marked.map((a) => ({
              student_id: a.student_id,
              subject_id: selectedSubject,
              date,
              status: a.status!,
            })),
            timestamp: Date.now(),
          });
          localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(0, 50)));
          setHasUnsaved(false);
          addToast("Saved offline, will sync when online", "info");
        });
      }
    }, autoSaveInterval * 1000);
    return () => clearInterval(interval);
  }, [hasUnsaved, isOnline, selectedSubject, attendance, autoSaveInterval]);

  const setStatus = (studentId: number, status: AttendanceStatus) => {
    setAttendance((prev) =>
      prev.map((a) => (a.student_id === studentId ? { ...a, status } : a))
    );
    setAutoSaved(false);
    setHasUnsaved(true);
  };

  const markAllPresent = () => {
    setAttendance((prev) => prev.map((a) => ({ ...a, status: "present" as AttendanceStatus })));
    setAutoSaved(false);
    setHasUnsaved(true);
  };

  const handleSave = async () => {
    if (!selectedSubject) {
      addToast("Please select a subject", "error");
      return;
    }
    const unmarked = attendance.filter((a) => !a.status);
    if (unmarked.length > 0) {
      addToast(`${unmarked.length} students have not been marked`, "error");
      return;
    }

    if (!isOnline) {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
      queue.push({
        date,
        subject_id: selectedSubject,
        marks: attendance.map((a) => ({
          student_id: a.student_id,
          subject_id: selectedSubject,
          date,
          status: a.status!,
        })),
        timestamp: Date.now(),
      });
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(0, 50)));
      addToast("Saved offline, will sync when online", "success");
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 3000);
      setHasUnsaved(false);
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/api/attendance/bulk", {
        method: "POST",
        body: {
          marks: attendance.filter((a) => a.status).map((a) => ({
            student_id: a.student_id,
            subject_id: selectedSubject,
            date,
            status: a.status,
          })),
        },
      });
      addToast("Attendance saved successfully", "success");
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 3000);
      setHasUnsaved(false);
    } catch (err: any) {
      addToast(err.message || "Failed to save attendance", "error");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const keyMap: Record<string, AttendanceStatus> = { p: "present", a: "absent", l: "late", e: "excused" };
      if (keyMap[e.key.toLowerCase()]) {
        const status = keyMap[e.key.toLowerCase()];
        setAttendance((prev) => {
          const lastMarked = prev.findLastIndex((a) => a.status !== null);
          const nextIndex = lastMarked + 1 < prev.length ? lastMarked + 1 : 0;
          return prev.map((a, i) => (i === nextIndex ? { ...a, status } : a));
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const markedCount = attendance.filter((a) => a.status).length;
  const totalStudents = students.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Mark Attendance</h2>
         <div className="flex items-center gap-3">
          {!isOnline && (
            <span className="flex items-center gap-1 text-sm text-orange-600">
              <WifiOff className="h-4 w-4" /> Offline mode
            </span>
          )}
          {isOnline && hasUnsaved && (
            <span className="flex items-center gap-1 text-sm text-blue-600">
              <Wifi className="h-4 w-4" /> Auto-saving in {autoSaveInterval}s
            </span>
          )}
          {autoSaved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" /> Saved
            </span>
          )}
          <Button onClick={handleSave} loading={saving} disabled={!selectedSubject}>
            <Save className="mr-2 h-4 w-4" />
            Save Attendance
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {!selectedSection && <p className="text-sm text-amber-600">Select a section from the header</p>}
        {!selectedSubject && <p className="text-sm text-amber-600">Select a subject from the header</p>}
      </div>

      {loading ? (
        <Spinner size="lg" className="mt-20" />
      ) : students.length > 0 ? (
        <>
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600">
              {markedCount}/{totalStudents} students marked
            </p>
            <Button variant="secondary" size="sm" onClick={markAllPresent}>
              Mark All Present
            </Button>
            <p className="text-xs text-gray-400">Keyboard: P/A/L/E to mark next student</p>
          </div>

          <div className="grid gap-3">
            {students.map((student, idx) => {
              const record = attendance.find((a) => a.student_id === student.id);
              return (
                <Card key={student.id} className="!px-4 !py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="w-8 text-sm font-medium text-gray-400">#{idx + 1}</span>
                      <div>
                        <p className="font-medium text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.roll_no}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {statuses.map((status) => (
                        <button
                          key={status}
                          onClick={() => setStatus(student.id, status)}
                          className={cn(
                            "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                            record?.status === status
                              ? statusColors[status]
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          )}
                        >
                          {statusLabels[status]}
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <div className="py-20 text-center text-sm text-gray-500">
          {!selectedSection || !selectedSubject
            ? "Please select a section and subject to mark attendance"
            : "No students found for this section"}
        </div>
      )}
    </div>
  );
}
