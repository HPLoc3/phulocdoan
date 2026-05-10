export const API_BASE = "http://127.0.0.1:8000/api/v1";

export const TOKEN_KEY = "ticketx_token";

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export type User = {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: "customer" | "operator" | "admin";
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const apiFetch = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const detail = (data && (data.detail || data.message)) || `Request failed (${res.status})`;
    const message = Array.isArray(detail)
      ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ")
      : String(detail);
    throw new ApiError(message, res.status);
  }
  return data as T;
};

export const authedFetcher = (path: string) => apiFetch(path);
