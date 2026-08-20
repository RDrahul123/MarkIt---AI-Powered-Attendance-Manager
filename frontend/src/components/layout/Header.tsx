import { useEffect, useState } from "react";
import { Menu, LogOut, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useAppStore } from "@/store/appStore";
import { useApi } from "@/hooks/useApi";
import { useNavigate } from "react-router-dom";
import type { Section, Subject, AcademicYear } from "@/types";


interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const { selectedSection, selectedSubject, selectedAcademicYear, setSelectedSection, setSelectedSubject, setSelectedAcademicYear } = useAppStore();
  const { apiFetch } = useApi();
  const navigate = useNavigate();

  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [yearsData, sectionsData] = await Promise.all([
          apiFetch<AcademicYear[]>("/api/sections/years"),
          apiFetch<Section[]>("/api/sections"),
        ]);
        setYears(yearsData);
        setSections(sectionsData);

        if (yearsData.length > 0 && !selectedAcademicYear) {
          const active = yearsData.find((y) => y.is_active) || yearsData[0];
          setSelectedAcademicYear(active.id);
        }
      } catch {
        // silent
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedSection) {
      setSubjects([]);
      return;
    }
    const fetchSubjects = async () => {
      try {
        const data = await apiFetch<Subject[]>(`/api/sections/subjects?section_id=${selectedSection}`);
        setSubjects(data);
      } catch {
        // silent
      }
    };
    fetchSubjects();
  }, [selectedSection]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm lg:px-6">
      <div className="flex items-center gap-4">
        <button onClick={onMenuToggle} className="rounded-md p-1 text-gray-500 hover:text-gray-700 lg:hidden">
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">MarkIt</h1>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={selectedAcademicYear ?? ""}
          onChange={(e) => setSelectedAcademicYear(Number(e.target.value) || null)}
          className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>{y.name}</option>
          ))}
        </select>

        <select
          value={selectedSection ?? ""}
          onChange={(e) => setSelectedSection(Number(e.target.value) || null)}
          className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Section</option>
          {sections
            .filter((s) => !selectedAcademicYear || s.academic_year_id === selectedAcademicYear)
            .map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
        </select>

        <select
          value={selectedSubject ?? ""}
          onChange={(e) => setSelectedSubject(Number(e.target.value) || null)}
          className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Subject</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </div>
            <span className="hidden md:block">{user?.username || "User"}</span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                <div className="border-b border-gray-100 px-4 py-2">
                  <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
