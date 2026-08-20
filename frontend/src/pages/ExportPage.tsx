import { useState } from "react";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { useApi } from "@/hooks/useApi";
import { useAppStore } from "@/store/appStore";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";

const exportFormats = [
  { value: "raw", label: "Raw Data" },
  { value: "summary", label: "Summary" },
  { value: "both", label: "Both" },
];

export default function ExportPage() {
  const { apiFetchBlob } = useApi();
  const { selectedSection, selectedSubject } = useAppStore();
  const { addToast } = useToast();

  const [fromDate, setFromDate] = useState(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [format_, setFormat] = useState("raw");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (selectedSection) params.append("section_id", String(selectedSection));
      if (selectedSubject) params.append("subject_id", String(selectedSubject));
      params.append("start_date", fromDate);
      params.append("end_date", toDate);

      const blob = await apiFetchBlob(`/api/export/excel?${params.toString()}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_export_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addToast("Export downloaded successfully", "success");
    } catch (err: any) {
      addToast(err.message || "Export failed", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Export Data</h2>

      <Card title="Export Options" className="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <Select
            label="Export Format"
            value={format_}
            onChange={(e) => setFormat(e.target.value)}
            options={exportFormats}
          />

          <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">
            <p>Section: <span className="font-medium">{selectedSection || "All"}</span></p>
            <p>Subject: <span className="font-medium">{selectedSubject || "All"}</span></p>
            <p>Date Range: <span className="font-medium">{fromDate} to {toDate}</span></p>
          </div>

          <Button onClick={handleExport} loading={exporting} size="lg">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </Card>
    </div>
  );
}
