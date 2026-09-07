import { getOrgHint } from './tenant/orgHint';

/**
 * The API base, including the `/api` suffix.
 *
 * ── Why a production build refuses to guess ─────────────────────────────────
 * This used to read `process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api'`,
 * and that fallback was repeated inline at twenty other call sites.
 *
 * `NEXT_PUBLIC_*` is inlined by Next at BUILD time. So a production build made
 * without the variable set does not fail at deploy, and does not fail at boot —
 * it ships a bundle in which every request is addressed to `localhost:5000`,
 * which in a browser means the VIEWER's own machine. Every call fails as a
 * network error, and the application looks exactly as it would if the backend
 * were down. The cause is invisible from the symptom.
 *
 * In development that fallback is genuinely useful and is kept. In a production
 * build it resolves to an empty string instead: `apiFetch` then throws with the
 * reason named, rather than silently addressing a machine that was never meant
 * to serve anyone. A misconfigured deployment should be obviously misconfigured.
 */
const CONFIGURED_API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || '').trim().replace(/\/+$/, '');

export const API_BASE =
	CONFIGURED_API_BASE || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000/api');

/** True when this build shipped with no address configured. */
export const API_BASE_CONFIGURED = API_BASE !== '';

const UNCONFIGURED =
	'NEXT_PUBLIC_API_BASE_URL was not set when this build was created, so it has no API address. ' +
	'Set it in the build environment and rebuild — it is inlined at build time, not read at runtime.';

/**
 * The base, or a thrown explanation. For callers that build their own URL and
 * would otherwise produce a same-origin path that 404s against this app.
 */
export function requireApiBase(): string {
	if (!API_BASE) throw new Error(UNCONFIGURED);
	return API_BASE;
}

/**
 * The API ORIGIN, without the `/api` suffix.
 *
 * For the handful of callers that cannot go through `apiFetch` — an
 * EventSource stream, which takes a URL and not a fetch — and which therefore
 * have to build their own. They used to read a second environment variable,
 * `NEXT_PUBLIC_API_URL`, that nothing else in this application sets, with a
 * hardcoded `http://localhost:5000` fallback; every deployment whose API lived
 * anywhere else silently talked to nothing.
 *
 * One base, derived from the one variable that is actually configured.
 */
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export async function apiFetch(path: string, options: RequestInit = {}) {
	const url = path.startsWith('http') ? path : `${requireApiBase()}${path.startsWith('/') ? path : `/${path}`}`;

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

	// ── Pre-authentication tenant routing ────────────────────────────────────
	// Only sent when the browser has actually learned an organization, and only
	// as a routing hint — the server rejects it outright if it disagrees with a
	// signed token, and re-derives the organization from the claim whenever one
	// exists. Its single job is letting a login screen be branded before there
	// is a credential to brand it with. See lib/tenant/orgHint.ts.
	// Sent ONLY when there is no token. With a token the signed `orgId` claim is
	// authoritative and a hint alongside it is at best redundant — and at worst
	// a 400, because the server rejects a hint that disagrees with a claim
	// rather than reconciling the two, and the remembered hint is a slug while
	// the claim is an id.
	if (!token && !headers.has('X-Org-Id')) {
		try {
			const hint = getOrgHint();
			if (hint) headers.set('X-Org-Id', hint);
		} catch {
			// never block a request over a cosmetic hint
		}
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
