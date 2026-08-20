import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useAppStore } from "@/store/appStore";
import { useToast } from "@/components/ui/Toast";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import type { Student } from "@/types";

interface StudentForm {
  name: string;
  roll_no: string;
  email: string;
  section_id: number | string;
}

const emptyForm: StudentForm = { name: "", roll_no: "", email: "", section_id: "" };

export default function StudentListPage() {
  const { apiFetch } = useApi();
  const { selectedSection, selectedAcademicYear } = useAppStore();
  const { addToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = selectedSection ? `?section_id=${selectedSection}` : (selectedAcademicYear ? `?academic_year_id=${selectedAcademicYear}` : "");
      const data = await apiFetch<Student[]>(`/api/students${params}`);
      setStudents(data);
    } catch (err: any) {
      addToast(err.message || "Failed to load students", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedSection]);

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_no.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm, section_id: selectedSection ?? "" });
    setModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingId(student.id);
    setForm({
      name: student.name,
      roll_no: student.roll_no,
      email: student.email,
      section_id: student.section_id,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.roll_no || !form.section_id) {
      addToast("Please fill all required fields", "error");
      return;
    }
    setSaving(true);
    try {
      const body = { ...form, section_id: Number(form.section_id), academic_year_id: selectedAcademicYear || 1 };
      if (editingId) {
        await apiFetch(`/api/students/${editingId}`, { method: "PUT", body });
        addToast("Student updated successfully", "success");
      } else {
        await apiFetch("/api/students", { method: "POST", body });
        addToast("Student created successfully", "success");
      }
      setModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      addToast(err.message || "Failed to save student", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/api/students/${id}`, { method: "DELETE" });
      addToast("Student deleted", "success");
      setDeleteConfirmId(null);
      fetchStudents();
    } catch (err: any) {
      addToast(err.message || "Failed to delete", "error");
    }
  };

  const columns = [
    { key: "roll_no", header: "Roll No", sortable: true },
    { key: "name", header: "Name", sortable: true },
    { key: "email", header: "Email", sortable: true },
    {
      key: "actions",
      header: "Actions",
      render: (s: Student) => (
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); openEditModal(s); }} className="text-blue-600 hover:text-blue-800">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(s.id); }} className="text-red-600 hover:text-red-800">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Students</h2>
        <Button onClick={openCreateModal} disabled={!selectedSection}>
          <Plus className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-80">
          <Input
            placeholder="Search by name, roll no, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {loading ? (
        <Spinner size="lg" className="mt-20" />
      ) : (
        <Table
          columns={columns}
          data={filteredStudents}
          keyExtractor={(s) => s.id}
          emptyMessage="No students found"
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Student" : "Add Student"}
      >
        <div className="space-y-4">
          <Input
            label="Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Student name"
          />
          <Input
            label="Roll No *"
            value={form.roll_no}
            onChange={(e) => setForm({ ...form, roll_no: e.target.value })}
            placeholder="Roll number"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email address"
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editingId ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirm Delete"
      >
        <p className="text-sm text-gray-600">Are you sure you want to delete this student? This action cannot be undone.</p>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
