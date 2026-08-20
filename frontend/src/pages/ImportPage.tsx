import { useState, useCallback, useRef } from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from "lucide-react";
import * as XLSX from "xlsx";
import { useApi } from "@/hooks/useApi";
import { useAppStore } from "@/store/appStore";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

interface ParsedRow {
  [key: string]: string;
}

interface ColumnMapping {
  name: string;
  roll_no: string;
  email: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

const COLUMN_MAP_OPTIONS = ["name", "roll_no", "email", "skip"];

export default function ImportPage() {
  const { apiFetch } = useApi();
  const { selectedSection, selectedAcademicYear } = useAppStore();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    name: "",
    roll_no: "",
    email: "",
  });
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [success, setSuccess] = useState(false);

  const autoDetectColumns = (cols: string[]) => {
    const mapping: ColumnMapping = { name: "", roll_no: "", email: "" };
    const lower = cols.map((c) => c.toLowerCase());
    for (const key of Object.keys(mapping) as (keyof ColumnMapping)[]) {
      const idx = lower.findIndex((c) => c.includes(key) || c.includes(key.replace("_", "")));
      if (idx >= 0) mapping[key] = cols[idx];
    }
    return mapping;
  };

  const handleFile = (f: File) => {
    setFile(f);
    setSuccess(false);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(firstSheet, { defval: "" });

        if (jsonData.length === 0) {
          addToast("File is empty", "error");
          return;
        }

        const cols = Object.keys(jsonData[0]);
        setHeaders(cols);
        setRows(jsonData);
        setPreview(jsonData.slice(0, 10));
        setColumnMapping(autoDetectColumns(cols));
      } catch {
        addToast("Failed to parse file", "error");
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".xls") || f.name.endsWith(".csv"))) {
      handleFile(f);
    } else {
      addToast("Please upload .xlsx, .xls, or .csv files", "error");
    }
  }, []);

  const validate = (): ValidationError[] => {
    const errs: ValidationError[] = [];
    if (!columnMapping.name) errs.push({ row: 0, field: "name", message: "Name column not mapped" });
    if (!columnMapping.roll_no) errs.push({ row: 0, field: "roll_no", message: "Roll No column not mapped" });

    const rollNos = new Set<string>();
    rows.forEach((row, i) => {
      const name = columnMapping.name ? String(row[columnMapping.name] || "").trim() : "";
      const rollNo = columnMapping.roll_no ? String(row[columnMapping.roll_no] || "").trim() : "";

      if (!name) errs.push({ row: i + 2, field: "name", message: "Name is required" });
      if (!rollNo) errs.push({ row: i + 2, field: "roll_no", message: "Roll No is required" });
      if (rollNo && rollNos.has(rollNo)) errs.push({ row: i + 2, field: "roll_no", message: `Duplicate roll no: ${rollNo}` });
      if (rollNo) rollNos.add(rollNo);
    });

    return errs;
  };

  const handleImport = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);

    if (validationErrors.length > 0) {
      addToast(`Found ${validationErrors.length} validation errors`, "error");
      return;
    }

    setImporting(true);
    try {
      const mappedRows = rows.map((row) => {
        const result: Record<string, string> = {};
        if (columnMapping.name) result.name = String(row[columnMapping.name] || "").trim();
        if (columnMapping.roll_no) result.roll_no = String(row[columnMapping.roll_no] || "").trim();
        if (columnMapping.email) result.email = String(row[columnMapping.email] || "").trim();
        return result;
      });

      await apiFetch("/api/students/import", {
        method: "POST",
        body: {
          students: mappedRows,
          section_id: selectedSection || 1,
          academic_year_id: selectedAcademicYear || 1,
        },
      });
      addToast(`Successfully imported ${mappedRows.length} students`, "success");
      setSuccess(true);
    } catch (err: any) {
      addToast(err.message || "Import failed", "error");
    } finally {
      setImporting(false);
    }
  };

  const columnOptions = [
    { value: "", label: "-- Select Column --" },
    ...headers.map((h) => ({ value: h, label: h })),
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Import Data</h2>

      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors",
            dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          )}
        >
          <Upload className="mb-4 h-12 w-12 text-gray-400" />
          <p className="text-lg font-medium text-gray-700">Drop your file here or click to browse</p>
          <p className="mt-1 text-sm text-gray-500">Supports .xlsx, .xls, .csv</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      ) : success ? (
        <Card className="text-center">
          <div className="py-8">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <p className="text-lg font-medium text-gray-900">Import Complete</p>
            <p className="text-sm text-gray-500">All students were imported successfully.</p>
            <Button className="mt-4" onClick={() => { setFile(null); setSuccess(false); setRows([]); setHeaders([]); }}>Import Another File</Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            <span className="font-medium text-gray-700">{file.name}</span>
            <span className="text-sm text-gray-500">({rows.length} rows)</span>
            <Button variant="ghost" size="sm" onClick={() => { setFile(null); setRows([]); setHeaders([]); setErrors([]); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Card title="Map Columns">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                label="Name *"
                value={columnMapping.name}
                onChange={(e) => setColumnMapping({ ...columnMapping, name: e.target.value })}
                options={columnOptions}
              />
              <Select
                label="Roll No *"
                value={columnMapping.roll_no}
                onChange={(e) => setColumnMapping({ ...columnMapping, roll_no: e.target.value })}
                options={columnOptions}
              />
              <Select
                label="Email"
                value={columnMapping.email}
                onChange={(e) => setColumnMapping({ ...columnMapping, email: e.target.value })}
                options={columnOptions}
              />
            </div>
          </Card>

          {errors.length > 0 && (
            <Card title="Validation Errors" className="border-red-200">
              <div className="max-h-48 overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-red-600">
                      <th className="pb-2 pr-4">Row</th>
                      <th className="pb-2 pr-4">Field</th>
                      <th className="pb-2">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.map((err, i) => (
                      <tr key={i} className="text-gray-700">
                        <td className="py-1 pr-4">{err.row || "-"}</td>
                        <td className="py-1 pr-4">{err.field}</td>
                        <td className="py-1">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Card title="Preview (First 10 Rows)">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    {headers.map((h) => (
                      <th key={h} className="pb-2 pr-4 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {headers.map((h) => (
                        <td key={h} className="py-2 pr-4 text-gray-700">{String(row[h] || "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setFile(null); setRows([]); setHeaders([]); }}>Cancel</Button>
            <Button onClick={handleImport} loading={importing}>
              {importing ? "Importing..." : `Import ${rows.length} Students`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
