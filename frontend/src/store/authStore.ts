import { create } from "zustand";
import { api } from "@/lib/api";
import { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const response = await api.post("/auth/login", { email, password });
    const { user, token } = response.data;

    localStorage.setItem("token", token);
    set({ user, token, isAuthenticated: true });
  },

  register: async (email: string, password: string, name?: string) => {
    const response = await api.post("/auth/register", {
      email,
      password,
      name,
    });
    const { user, token } = response.data;

    localStorage.setItem("token", token);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        // Fetch user data with the token
        const response = await api.get("/auth/me");
        set({ user: response.data, token, isAuthenticated: true });
      } catch (error) {
        // Token invalid, clear it
        localStorage.removeItem("token");
        set({ user: null, token: null, isAuthenticated: false });
      }
    } else {
      set({ user: null, token: null, isAuthenticated: false });
    }
  },
}));
