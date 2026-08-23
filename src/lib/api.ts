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

const DEFAULT_UPLOAD_TIMEOUT = 30000;

// Uploads a local image (picked via expo-image-picker) to the backend, which
// converts it to WebP and hosts it on ImgBB. Kept separate from `api()` since
// this needs a multipart body instead of JSON.
export async function uploadImage(
  localUri: string,
  token?: string,
  timeoutMs = DEFAULT_UPLOAD_TIMEOUT
): Promise<ApiResult<{ success: boolean; url: string }>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const filename = localUri.split("/").pop() || `photo-${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const ext = match?.[1]?.toLowerCase() || "jpg";
    const mimeType = ext === "png" ? "image/png" : ext === "heic" ? "image/heic" : "image/jpeg";

    const formData = new FormData();
    formData.append("image", { uri: localUri, name: filename, type: mimeType } as unknown as Blob);

    const res = await fetch(`${config.apiUrl}/api/upload/image`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
      signal: controller.signal,
    });

    const text = await res.text();
    const json = text ? (JSON.parse(text) as unknown) : null;

    if (!res.ok) {
      const message =
        (json && typeof json === "object" && "message" in json
          ? String((json as { message: unknown }).message)
          : null) || `Upload failed with ${res.status}`;
      return { ok: false, status: res.status, message };
    }

    return { ok: true, data: json as { success: boolean; url: string } };
  } catch (err) {
    if (controller.signal.aborted) {
      return { ok: false, status: 0, message: "Upload timed out" };
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
