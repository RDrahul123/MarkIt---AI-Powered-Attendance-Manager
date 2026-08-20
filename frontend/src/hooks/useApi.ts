import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: any;
}

export function useApi() {
  const { token, logout } = useAuthStore();
  const navigate = useNavigate();

  const apiFetch = useCallback(
    async <T = any>(url: string, options: FetchOptions = {}): Promise<T> => {
      const { body, headers: customHeaders, ...rest } = options;

      const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(customHeaders as Record<string, string>),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(fullUrl, {
        ...rest,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.status === 401) {
        logout();
        navigate("/login");
        throw new Error("Unauthorized");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `Request failed with status ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return response.json();
      }

      return response.text() as unknown as T;
    },
    [token, logout, navigate]
  );

  const apiFetchBlob = useCallback(
    async (url: string, options: FetchOptions = {}): Promise<Blob> => {
      const { body, headers: customHeaders, ...rest } = options;

      const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;

      const headers: Record<string, string> = {
        ...(customHeaders as Record<string, string>),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      if (body && !(body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(fullUrl, {
        ...rest,
        headers,
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      });

      if (response.status === 401) {
        logout();
        navigate("/login");
        throw new Error("Unauthorized");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Request failed with status ${response.status}`);
      }

      return response.blob();
    },
    [token, logout, navigate]
  );

  return { apiFetch, apiFetchBlob };
}
