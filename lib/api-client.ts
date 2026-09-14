/** Fetch helper cho các /api/* của app — tung ra ApiError có code + payload. */

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 500,
    public code = "ERROR",
    public data: unknown = null
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T = unknown>(
  path: string,
  init?: { method?: string; body?: unknown }
): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body != null ? JSON.stringify(init.body) : undefined,
    credentials: "same-origin",
  });

  let json: Record<string, unknown> | null = null;
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const err = (json?.error ?? {}) as { code?: string; message?: string };
    throw new ApiError(
      err.message || "Không thể kết nối đến máy chủ. Vui lòng thử lại.",
      res.status,
      err.code || "ERROR",
      json
    );
  }
  return (json ?? {}) as T;
}
