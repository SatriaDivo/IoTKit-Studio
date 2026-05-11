import { create } from "zustand";
import { api } from "@/lib/api";
import { Project } from "@/types";

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (data: Partial<Project>) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  testConnection: (
    id: string,
  ) => Promise<{ connected: boolean; error?: string }>;
  setCurrentProject: (project: Project | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  loading: false,

  fetchProjects: async () => {
    set({ loading: true });
    try {
      const response = await api.get("/projects");
      set({ projects: response.data, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  fetchProject: async (id: string) => {
    set({ loading: true });
    try {
      const response = await api.get(`/projects/${id}`);
      set({ currentProject: response.data, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  createProject: async (data: Partial<Project>) => {
    const response = await api.post("/projects", data);
    set((state) => ({ projects: [response.data, ...state.projects] }));
    return response.data;
  },

  updateProject: async (id: string, data: Partial<Project>) => {
    const response = await api.put(`/projects/${id}`, data);
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? response.data : p)),
      currentProject:
        state.currentProject?.id === id ? response.data : state.currentProject,
    }));
    return response.data;
  },

  deleteProject: async (id: string) => {
    await api.delete(`/projects/${id}`);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject:
        state.currentProject?.id === id ? null : state.currentProject,
    }));
  },

  testConnection: async (id: string) => {
    const response = await api.post(`/projects/${id}/test-connection`);
    return response.data;
  },

  setCurrentProject: (project: Project | null) => {
    set({ currentProject: project });
  },
}));
