export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

export async function apiFetch(path: string, options: RequestInit = {}) {
	const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

	const headers = new Headers(options.headers || {});
	let token: string | null = null;
	try {
		if (typeof window !== 'undefined') {
			token = localStorage.getItem('accessToken');
			// Handle case where localStorage has string "null" instead of actual null
			if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
				headers.set('Authorization', `Bearer ${token}`);
				console.log('[apiFetch] Token found and added to headers');
			} else {
				console.warn('[apiFetch] No valid token found in localStorage. Token value:', token);
				token = null;
				// Don't add Authorization header at all if token is invalid
			}
		}
	} catch {
		// ignore in SSR
	}

	if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
		headers.set('Content-Type', 'application/json');
	}

	console.log('[apiFetch] Request:', { url, method: options.method || 'GET', hasToken: !!token });

	const res = await fetch(url, { 
		...options, 
		headers,
		credentials: 'include' // Ensure cookies and credentials are sent with cross-origin requests
	});

	// handle common status codes
	if (res.status === 204) return null;
	let data: unknown = null;
	try {
		data = await res.json();
	} catch {
		// not json
	}

		if (!res.ok) {
					function getErrorMessage(obj: unknown): string | null {
						if (typeof obj !== 'object' || obj === null) return null;
						const rec = obj as Record<string, unknown>;
						if (typeof rec['message'] === 'string' && rec['message'].trim()) return rec['message'];
						if (typeof rec['error'] === 'string' && rec['error'].trim()) return rec['error'];
						if (Array.isArray(rec['errors']) && rec['errors'].length > 0) {
							const first = rec['errors'][0];
							if (typeof first === 'string') return first;
							if (typeof first === 'object' && first !== null && typeof (first as Record<string, unknown>)['message'] === 'string') {
								return String((first as Record<string, unknown>)['message']);
							}
						}
						return null;
					}

				const message = getErrorMessage(data) || res.statusText || 'API error';
			console.error('[apiFetch] Error:', { status: res.status, message, data });
			const err = new Error(message) as Error & { status?: number; data?: unknown };
			err.status = res.status;
			err.data = data;
			throw err;
		}

	return data;
}
