import { getServerBaseUrl } from "@/lib/server-base-url";

const BASE_URL = getServerBaseUrl();

interface RequestOptions extends RequestInit {
  bypassCache?: boolean;
  cacheTtl?: number;
  suppressAuthRedirect?: boolean;
}

interface CacheEntry {
  data: unknown;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method || "GET";
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const cacheKey = `${method}:${url}`;

  if (method === "GET" && !options.bypassCache) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data as T;
    }
  }

  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch (e) {
    throw new ApiError((e as Error).message || "Network request failed", 0, "NETWORK_ERROR");
  }

  if (!response.ok) {
    if (response.status === 401 && !options.suppressAuthRedirect) {
      window.dispatchEvent(new CustomEvent("auth-session-expired"));
    }
    let errorMessage = `API Request failed with status ${response.status}`;
    let errorCode: string | undefined;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
      errorCode = errorData.code;
    } catch {
      // ignore
    }
    throw new ApiError(errorMessage, response.status, errorCode);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();

  if (method === "GET") {
    const ttl = options.cacheTtl !== undefined ? options.cacheTtl : 0;
    if (ttl > 0) {
      cache.set(cacheKey, {
        data,
        expiry: Date.now() + ttl,
      });
    }
  } else {
    cache.clear();
  }

  return data as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "DELETE" }),
  clearCache: () => cache.clear(),
};
