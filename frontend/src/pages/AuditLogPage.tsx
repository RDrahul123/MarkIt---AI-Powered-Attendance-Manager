import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/components/ui/Toast";
import { Table } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { AuditLog } from "@/types";

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "login", label: "Login" },
  { value: "import", label: "Import" },
  { value: "export", label: "Export" },
];

const ENTITY_OPTIONS = [
  { value: "", label: "All Entities" },
  { value: "student", label: "Student" },
  { value: "attendance", label: "Attendance" },
  { value: "section", label: "Section" },
  { value: "subject", label: "Subject" },
  { value: "user", label: "User" },
];

const PAGE_SIZE = 20;

export default function AuditLogPage() {
  const { apiFetch } = useApi();
  const { addToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.append("action", actionFilter);
      if (entityFilter) params.append("entity_type", entityFilter);
      params.append("limit", String(PAGE_SIZE));
      params.append("offset", String((page - 1) * PAGE_SIZE));

      const data = await apiFetch<AuditLog[]>(`/api/audit?${params.toString()}`);
      setLogs(data);
      setTotal(data.length < PAGE_SIZE && page === 1 ? data.length : page * PAGE_SIZE + 1);
    } catch (err: any) {
      addToast(err.message || "Failed to load audit log", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchLogs();
  }, [actionFilter, entityFilter, fromDate, toDate]);

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const columns = [
    {
      key: "created_at",
      header: "Date",
      sortable: true,
      render: (log: AuditLog) => (
        <span className="text-xs">{format(new Date(log.created_at), "MMM d, yyyy HH:mm")}</span>
      ),
    },
    { key: "user_id", header: "User ID", render: (log: AuditLog) => <span>#{log.user_id}</span> },
    {
      key: "action",
      header: "Action",
      render: (log: AuditLog) => (
        <Badge variant={log.action === "delete" ? "absent" : log.action === "create" ? "present" : "default"}>
          {log.action}
        </Badge>
      ),
    },
    { key: "entity_type", header: "Entity" },
    { key: "entity_id", header: "Entity ID", render: (log: AuditLog) => <span>#{log.entity_id}</span> },
    {
      key: "details",
      header: "Details",
      render: (log: AuditLog) => (
        <span className="max-w-xs truncate text-xs text-gray-500" title={JSON.stringify(log.details)}>
          {typeof log.details === "string" ? log.details : JSON.stringify(log.details).slice(0, 50)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Audit Log</h2>

      <div className="flex flex-wrap items-end gap-4">
        <div className="w-64">
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <Select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          options={ACTION_OPTIONS}
        />
        <Select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          options={ENTITY_OPTIONS}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs}>
          Apply Filters
        </Button>
      </div>

      {loading ? (
        <Spinner size="lg" className="mt-20" />
      ) : (
        <>
          <Table columns={columns} data={logs} keyExtractor={(log) => log.id} emptyMessage="No audit logs found" />

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
