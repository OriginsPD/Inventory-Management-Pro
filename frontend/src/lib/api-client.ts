const BASE_URL = 'http://localhost:3002';

interface RequestOptions extends RequestInit {
  bypassCache?: boolean;
  cacheTtl?: number; // duration in ms, default 2000
}

interface CacheEntry {
  data: any;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method || 'GET';
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  
  // Cache key
  const cacheKey = `${method}:${url}`;
  
  // Check cache for GET requests
  if (method === 'GET' && !options.bypassCache) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data as T;
    }
  }

  // Construct headers
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('auth-session-expired'));
    }
    let errorMessage = `API Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  // If status is 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();

  // Cache GET requests
  if (method === 'GET') {
    const ttl = options.cacheTtl !== undefined ? options.cacheTtl : 2000; // 2 seconds default cache
    if (ttl > 0) {
      cache.set(cacheKey, {
        data,
        expiry: Date.now() + ttl,
      });
    }
  } else {
    // Invalidate cache on mutations (POST, PUT, DELETE)
    cache.clear();
  }

  return data as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: any, options?: RequestOptions) => 
    request<T>(path, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: any, options?: RequestOptions) => 
    request<T>(path, { ...options, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
  clearCache: () => cache.clear(),
};
