import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, FolderTree } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import type { AcademicYear, Section, Subject } from "@/types";

type EntityType = "year" | "section" | "subject";

export default function SectionManagementPage() {
  const { apiFetch } = useApi();
  const { addToast } = useToast();

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [sectionsMap, setSectionsMap] = useState<Map<number, Section[]>>(new Map());
  const [subjectsMap, setSubjectsMap] = useState<Map<number, Subject[]>>(new Map());
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<EntityType>("year");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [parentId, setParentId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: EntityType; id: number } | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const yearsData = await apiFetch<AcademicYear[]>("/api/sections/years");
      setYears(yearsData);

      const newSectionsMap = new Map<number, Section[]>();
      await Promise.all(
        yearsData.map(async (y) => {
          const secs = await apiFetch<Section[]>(`/api/sections?academic_year_id=${y.id}`);
          newSectionsMap.set(y.id, secs);
        })
      );
      setSectionsMap(newSectionsMap);

      const newSubjectsMap = new Map<number, Subject[]>();
      for (const [, secs] of newSectionsMap) {
        await Promise.all(
          secs.map(async (s) => {
            const subs = await apiFetch<Subject[]>(`/api/sections/subjects?section_id=${s.id}`);
            newSubjectsMap.set(s.id, subs);
          })
        );
      }
      setSubjectsMap(newSubjectsMap);
    } catch (err: any) {
      addToast(err.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const toggleYear = (id: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSection = (id: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreate = (type: EntityType, parentIdVal: number | null = null) => {
    setModalType(type);
    setEditingItem(null);
    setFormName("");
    setFormCode("");
    setParentId(parentIdVal);
    setModalOpen(true);
  };

  const openEdit = (type: EntityType, item: any) => {
    setModalType(type);
    setEditingItem(item);
    setFormName(item.name || "");
    setFormCode(item.code || "");
    setParentId(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      addToast("Name is required", "error");
      return;
    }
    setSaving(true);
    try {
      if (modalType === "year") {
        const body = { name: formName, is_active: editingItem?.is_active ?? false };
        if (editingItem) {
          await apiFetch(`/api/sections/years/${editingItem.id}`, { method: "PUT", body });
        } else {
          await apiFetch("/api/sections/years", { method: "POST", body });
        }
      } else if (modalType === "section") {
        const body = { name: formName, academic_year_id: parentId ?? editingItem?.academic_year_id };
        if (editingItem) {
          await apiFetch(`/api/sections/${editingItem.id}`, { method: "PUT", body });
        } else {
          await apiFetch("/api/sections", { method: "POST", body });
        }
      } else {
        const body = { name: formName, code: formCode, section_id: parentId ?? editingItem?.section_id };
        if (editingItem) {
          await apiFetch(`/api/sections/subjects/${editingItem.id}`, { method: "PUT", body });
        } else {
          await apiFetch("/api/sections/subjects", { method: "POST", body });
        }
      }
      addToast(`${modalType} saved successfully`, "success");
      setModalOpen(false);
      fetchAll();
    } catch (err: any) {
      addToast(err.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const endpoint =
        deleteConfirm.type === "year"
          ? `/api/sections/years/${deleteConfirm.id}`
          : deleteConfirm.type === "section"
          ? `/api/sections/${deleteConfirm.id}`
          : `/api/sections/subjects/${deleteConfirm.id}`;
      await apiFetch(endpoint, { method: "DELETE" });
      addToast("Deleted successfully", "success");
      setDeleteConfirm(null);
      fetchAll();
    } catch (err: any) {
      addToast(err.message || "Failed to delete", "error");
    }
  };

  if (loading) return <Spinner size="lg" className="mt-20" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Sections Management</h2>
        <Button onClick={() => openCreate("year")}>
          <Plus className="mr-2 h-4 w-4" /> Add Academic Year
        </Button>
      </div>

      <Card>
        <div className="space-y-2">
          {years.length === 0 && <p className="text-sm text-gray-500">No academic years found</p>}
          {years.map((year) => (
            <div key={year.id} className="rounded-md border border-gray-200">
              <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleYear(year.id)} className="text-gray-500">
                    {expandedYears.has(year.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <FolderTree className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-gray-900">{year.name}</span>
                  {year.is_active && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Active</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit("year", year)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteConfirm({ type: "year", id: year.id })} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {expandedYears.has(year.id) && (
                <div className="border-t border-gray-100 bg-gray-50/50 pl-8 pr-4 py-2">
                  {(sectionsMap.get(year.id) || []).map((section) => (
                    <div key={section.id} className="mb-1 rounded border border-gray-100 bg-white">
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleSection(section.id)} className="text-gray-500">
                            {expandedSections.has(section.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </button>
                          <span className="text-sm font-medium text-gray-800">{section.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEdit("section", section)} className="rounded p-1 text-gray-400 hover:text-blue-600">
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button onClick={() => setDeleteConfirm({ type: "section", id: section.id })} className="rounded p-1 text-gray-400 hover:text-red-600">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {expandedSections.has(section.id) && (
                        <div className="border-t border-gray-50 bg-gray-50/30 pl-6 pr-3 py-2">
                          {(subjectsMap.get(section.id) || []).map((subject) => (
                            <div key={subject.id} className="flex items-center justify-between rounded px-3 py-1.5 hover:bg-gray-100">
                              <div>
                                <span className="text-sm text-gray-800">{subject.name}</span>
                                <span className="ml-2 text-xs text-gray-400">{subject.code}</span>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => openEdit("subject", subject)} className="rounded p-0.5 text-gray-400 hover:text-blue-600">
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button onClick={() => setDeleteConfirm({ type: "subject", id: subject.id })} className="rounded p-0.5 text-gray-400 hover:text-red-600">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => openCreate("subject", section.id)}
                            className="mt-1 flex items-center gap-1 rounded px-3 py-1 text-xs text-blue-600 hover:bg-blue-50"
                          >
                            <Plus className="h-3 w-3" /> Add Subject
                          </button>
                          {(subjectsMap.get(section.id) || []).length === 0 && (
                            <p className="px-3 py-1 text-xs text-gray-400">No subjects</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => openCreate("section", year.id)}
                    className="mt-1 flex items-center gap-1 rounded px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="h-3 w-3" /> Add Section
                  </button>
                  {(sectionsMap.get(year.id) || []).length === 0 && (
                    <p className="px-3 py-1 text-xs text-gray-400">No sections</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${editingItem ? "Edit" : "Add"} ${modalType.charAt(0).toUpperCase() + modalType.slice(1)}`}
      >
        <div className="space-y-4">
          <Input
            label="Name *"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder={`${modalType} name`}
          />
          {modalType === "subject" && (
            <Input
              label="Code *"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              placeholder="Subject code (e.g., CS101)"
            />
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Confirm Delete"
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete this {deleteConfirm?.type}? This may also delete all nested items.
        </p>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
