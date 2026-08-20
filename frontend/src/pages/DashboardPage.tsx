import { useEffect, useState } from "react";
import { Users, BookOpen, ClipboardCheck, AlertTriangle, TrendingUp } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useApi } from "@/hooks/useApi";
import { useAppStore } from "@/store/appStore";
import type { DashboardStats } from "@/types";

interface TrendData {
  date: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  rate?: number;
}

interface SectionAttendance {
  section_name: string;
  rate: number;
}

interface AtRiskStudent {
  student_id: number;
  student_name: string;
  roll_no: string;
  section_name: string;
  attendance_pct: number;
  total_sessions: number;
  absent_count: number;
}

export default function DashboardPage() {
  const { apiFetch } = useApi();
  const { selectedAcademicYear } = useAppStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [sectionData, setSectionData] = useState<SectionAttendance[]>([]);
  const [atRisk, setAtRisk] = useState<AtRiskStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError("");
      try {
        const [statsData, trendsData, sectionDataRes, atRiskData] = await Promise.all([
          apiFetch<DashboardStats>("/api/dashboard/stats"),
          apiFetch<TrendData[]>("/api/dashboard/by-date"),
          apiFetch<any[]>("/api/dashboard/by-section"),
          apiFetch<AtRiskStudent[]>("/api/dashboard/at-risk"),
        ]);
        setStats(statsData);
        setTrends(trendsData.map((t: any) => ({
          date: t.date,
          present: t.present,
          absent: t.absent,
          late: t.late,
          excused: t.excused,
          total: t.total,
          rate: t.total > 0 ? Math.round(((t.present + t.late) / t.total) * 100) : 0,
        })));
        setSectionData(sectionDataRes.map((s: any) => ({
          section_name: s.section_name,
          rate: s.percentage,
        })));
        setAtRisk(atRiskData);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [selectedAcademicYear]);

  if (loading) return <Spinner size="lg" className="mt-20" />;

  if (error) {
    return (
      <div className="mt-20 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const statCards = [
    { label: "Total Students", value: stats?.total_students ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Sections", value: stats?.total_sections ?? 0, icon: BookOpen, color: "text-purple-600", bg: "bg-purple-100" },
    { label: "Subjects", value: stats?.total_subjects ?? 0, icon: ClipboardCheck, color: "text-green-600", bg: "bg-green-100" },
    { label: "Attendance Rate", value: `${stats?.overall_attendance_pct ?? 0}%`, icon: TrendingUp, color: "text-yellow-600", bg: "bg-yellow-100" },
    { label: "Total Records", value: stats?.total_attendance_records ?? 0, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => (
          <Card key={card.label} className="flex items-center gap-4">
            <div className={`rounded-lg p-3 ${card.bg}`}>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Attendance Trend (30 Days)">
          <div className="h-72">
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-gray-500">No trend data available</p>
            )}
          </div>
        </Card>

        <Card title="Section-wise Attendance">
          <div className="h-72">
            {sectionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="section_name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="rate" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-gray-500">No section data available</p>
            )}
          </div>
        </Card>
      </div>

      <Card title="At-Risk Students" description="Students with attendance below 75%">
        {atRisk.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 pr-4 font-medium">Name</th>
                  <th className="pb-3 pr-4 font-medium">Roll No</th>
                  <th className="pb-3 pr-4 font-medium">Attendance</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {atRisk.map((s) => (
                  <tr key={s.student_id} className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-medium text-gray-900">{s.student_name}</td>
                    <td className="py-3 pr-4 text-gray-600">{s.roll_no}</td>
                    <td className="py-3 pr-4 text-gray-600">{s.attendance_pct.toFixed(1)}%</td>
                    <td className="py-3">
                      <Badge variant="absent">At Risk</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-gray-500">No at-risk students found</p>
        )}
      </Card>
    </div>
  );
}
