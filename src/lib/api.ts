import { config } from "@/constants/config";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT = 15000;

export async function api<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResult<T>> {
  const {
    method = "GET",
    body,
    headers = {},
    token,
    signal,
    timeoutMs = DEFAULT_TIMEOUT,
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(`${config.apiUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body != null ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    const json = text ? (JSON.parse(text) as unknown) : null;

    if (!res.ok) {
      const message =
        (json && typeof json === "object" && "message" in json
          ? String((json as { message: unknown }).message)
          : null) || `Request failed with ${res.status}`;
      return { ok: false, status: res.status, message };
    }

    return { ok: true, data: json as T };
  } catch (err) {
    if (controller.signal.aborted) {
      return { ok: false, status: 0, message: "Request timed out" };
    }
    return {
      ok: false,
      status: 0,
      message: err instanceof Error ? err.message : "Network error",
    };
  } finally {
    clearTimeout(timer);
  }
}
