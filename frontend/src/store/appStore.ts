import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  selectedSection: number | null;
  selectedSubject: number | null;
  selectedAcademicYear: number | null;
  theme: "light" | "dark";
  setSelectedSection: (id: number | null) => void;
  setSelectedSubject: (id: number | null) => void;
  setSelectedAcademicYear: (id: number | null) => void;
  setTheme: (theme: "light" | "dark") => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedSection: null,
      selectedSubject: null,
      selectedAcademicYear: null,
      theme: "light",
      setSelectedSection: (id) => set({ selectedSection: id }),
      setSelectedSubject: (id) => set({ selectedSubject: id }),
      setSelectedAcademicYear: (id) => set({ selectedAcademicYear: id }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "markit-app",
    }
  )
);
