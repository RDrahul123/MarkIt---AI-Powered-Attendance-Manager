import { useState, useEffect } from "react";
import { Moon, Sun, Save, Download, Upload, Bell } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";

const NOTIFICATION_OPTIONS = [
  { value: "none", label: "No notifications" },
  { value: "low_attendance", label: "Low attendance alerts only" },
  { value: "daily_reminder", label: "Daily reminders + alerts" },
  { value: "all", label: "All notifications" },
];

export default function SettingsPage() {
  const { apiFetch, apiFetchBlob } = useApi();
  const { user } = useAuthStore();
  const { theme, setTheme } = useAppStore();
  const { addToast } = useToast();

  const [notifications, setNotifications] = useState("low_attendance");
  const [autoSaveInterval, setAutoSaveInterval] = useState("5");
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("markit-settings");
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setNotifications(settings.notifications || "low_attendance");
        setAutoSaveInterval(settings.autoSaveInterval || "5");
      } catch {}
    }
  }, []);

  const saveSettings = () => {
    const settings = { notifications, autoSaveInterval };
    localStorage.setItem("markit-settings", JSON.stringify(settings));
    addToast("Settings saved successfully", "success");
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const blob = await apiFetchBlob("/api/export/backup");
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "markit-backup.json";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addToast("Backup downloaded successfully", "success");
    } catch (err: any) {
      addToast(err.message || "Backup failed", "error");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreLoading(true);
    try {
      const text = await file.text();
      await apiFetch("/api/export/restore", {
        method: "POST",
        body: { data: JSON.parse(text) },
      });
      addToast("Data restored successfully", "success");
      e.target.value = "";
    } catch (err: any) {
      addToast(err.message || "Restore failed", "error");
    } finally {
      setRestoreLoading(false);
    }
  };

  const toggleTheme = (checked: boolean) => {
    const newTheme = checked ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", checked);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

      <Card title="Appearance">
        <div className="space-y-4">
          <Toggle
            checked={theme === "dark"}
            onChange={toggleTheme}
            label="Dark mode"
          />
          <div className="flex gap-3">
            {theme === "light" && <Sun className="h-5 w-5 text-gray-500" />}
            {theme === "dark" && <Moon className="h-5 w-5 text-gray-500" />}
          </div>
        </div>
      </Card>

      <Card title="Notifications">
        <div className="space-y-4">
          <Select
            label="Notification preference"
            value={notifications}
            onChange={(e) => setNotifications(e.target.value)}
            options={NOTIFICATION_OPTIONS}
          />
          <p className="text-sm text-gray-500">
            Low attendance alerts are sent when a student's attendance drops below 75%.
          </p>
        </div>
      </Card>

      <Card title="Attendance Preferences">
        <div className="space-y-4">
          <Input
            label="Auto-save interval (seconds)"
            type="number"
            min="1"
            max="30"
            value={autoSaveInterval}
            onChange={(e) => setAutoSaveInterval(e.target.value)}
          />
          <p className="text-sm text-gray-500">
            Attendance data is automatically saved at this interval while marking.
          </p>
        </div>
      </Card>

      <Card title="Account">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-medium text-blue-600">
            {user?.username?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <p className="font-medium text-gray-900">{user?.username}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <p className="text-xs text-gray-400">Role: {user?.role}</p>
          </div>
        </div>
      </Card>

      <Card title="Data Management">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Bell className="h-5 w-5 text-gray-400" />
            <Button variant="outline" onClick={handleBackup} loading={backupLoading}>
              <Download className="mr-2 h-4 w-4" />
              Download Backup
            </Button>
            <span className="text-sm text-gray-500">Export all data as JSON</span>
          </div>

          <div className="flex items-center gap-4">
            <Upload className="h-5 w-5 text-gray-400" />
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json"
                onChange={handleRestore}
                className="hidden"
                disabled={restoreLoading}
              />
              <Button variant="outline" asChild={false}>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Restore from Backup
                </span>
              </Button>
            </label>
            <span className="text-sm text-gray-500">Restore from a previous backup</span>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings}>
          <Save className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
