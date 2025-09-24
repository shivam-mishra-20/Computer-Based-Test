// Lightweight fetch wrapper for frontend API calls.
// Adds Authorization header with access token from localStorage.
// Replace or extend with refresh-token logic / cookie-based auth as needed.

// default to local backend per API_Implementation.md
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function apiFetch(path: string, options: RequestInit = {}) {
	const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

	const headers = new Headers(options.headers || {});
	try {
		if (typeof window !== 'undefined') {
			const token = localStorage.getItem('accessToken');
			if (token) headers.set('Authorization', `Bearer ${token}`);
		}
	} catch {
		// ignore in SSR
	}

	if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
		headers.set('Content-Type', 'application/json');
	}

	const res = await fetch(url, { ...options, headers });

	// handle common status codes
	if (res.status === 204) return null;
	let data: unknown = null;
	try {
		data = await res.json();
	} catch {
		// not json
	}

		if (!res.ok) {
				function hasMessage(obj: unknown): obj is { message: string } {
					if (typeof obj !== 'object' || obj === null) return false;
					const rec = obj as Record<string, unknown>;
					return 'message' in rec && typeof rec['message'] === 'string';
				}

			const message = hasMessage(data) ? data.message : res.statusText || 'API error';
			const err = new Error(message) as Error & { status?: number; data?: unknown };
			err.status = res.status;
			err.data = data;
			throw err;
		}

	return data;
}
