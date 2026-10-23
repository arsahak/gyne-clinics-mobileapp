import { config } from "@/constants/config";

// Client for the Gyneclinics backend (same API as the webapp: /api/v1).
// The backend answers { success, message, data, errors? }; api() returns the
// `data` part, or the first error to show.

export type ApiResult<T> =
  | { ok: true; status: number; data: T; message: string }
  | { ok: false; status: number; message: string };

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Defaults to the signed-in user's token. Pass null for public endpoints. */
  token?: string | null;
  signal?: AbortSignal;
  timeoutMs?: number;
};

const BASE = `${config.apiUrl.replace(/\/$/, "")}/api/v1`;
const DEFAULT_TIMEOUT = 15_000;
const UPLOAD_TIMEOUT = 45_000;

// Set by AuthProvider: the current login token, and what to do when the
// backend says it's no longer valid (sign out).
let sessionToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setSessionToken(token: string | null) {
  sessionToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function request<T>(path: string, init: RequestInit, token: string | null | undefined, timeoutMs: number, signal?: AbortSignal): Promise<ApiResult<T>> {
  const bearer = token === undefined ? sessionToken : token;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  signal?.addEventListener("abort", () => controller.abort(), { once: true });

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { Accept: "application/json", ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...init.headers },
      signal: controller.signal,
    });
    const text = await res.text();
    let json: { message?: unknown; data?: unknown; errors?: unknown } | null = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // Not JSON (e.g. a proxy error page); handled below.
    }

    if (!res.ok) {
      // A signed-in request was refused: the login has expired or the account was blocked.
      if (res.status === 401 && bearer && bearer === sessionToken) onUnauthorized?.();
      const firstError = Array.isArray(json?.errors) ? json.errors[0] : undefined;
      const message = (typeof firstError === "string" && firstError) || (typeof json?.message === "string" && json.message) || `Something went wrong (${res.status}). Please try again.`;
      return { ok: false, status: res.status, message };
    }
    return { ok: true, status: res.status, data: (json?.data ?? null) as T, message: typeof json?.message === "string" ? json.message : "OK" };
  } catch {
    if (controller.signal.aborted && !signal?.aborted) {
      return { ok: false, status: 0, message: "The server took too long to answer. Please try again." };
    }
    return { ok: false, status: 0, message: "Can't reach the server. Please check your connection and try again." };
  } finally {
    clearTimeout(timer);
  }
}

/** JSON request. */
export function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const { method = "GET", body, token, signal, timeoutMs = DEFAULT_TIMEOUT } = options;
  return request<T>(
    path,
    {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
    token,
    timeoutMs,
    signal,
  );
}

/** A local file (from expo-image-picker) as a multipart form part. */
export function filePart(uri: string, fallbackName = "photo.jpg") {
  const name = uri.split("/").pop() || fallbackName;
  const ext = /\.(\w+)$/.exec(name)?.[1]?.toLowerCase();
  const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return { uri, name, type } as unknown as Blob;
}

/** Multipart request (photo and story uploads). */
export function apiForm<T = unknown>(path: string, form: FormData, method: "POST" | "PATCH" = "POST"): Promise<ApiResult<T>> {
  return request<T>(path, { method, body: form }, undefined, UPLOAD_TIMEOUT);
}
