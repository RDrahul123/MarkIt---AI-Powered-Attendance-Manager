import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/Toast";
import { Layout } from "@/components/layout/Layout";
import { useAuthStore } from "@/store/authStore";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import StudentListPage from "@/pages/StudentListPage";
import AttendancePage from "@/pages/AttendancePage";
import ImportPage from "@/pages/ImportPage";
import ExportPage from "@/pages/ExportPage";
import SectionManagementPage from "@/pages/SectionManagementPage";
import AIAssistantPage from "@/pages/AIAssistantPage";
import AuditLogPage from "@/pages/AuditLogPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/students" element={<StudentListPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/export" element={<ExportPage />} />
              <Route path="/sections" element={<SectionManagementPage />} />
              <Route path="/ai" element={<AIAssistantPage />} />
              <Route path="/audit" element={<AuditLogPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
