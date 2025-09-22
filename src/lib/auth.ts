import { apiFetch } from './api';

export type Credentials = { email: string; password: string };
export type User = { id?: string; email?: string; role?: 'admin' | 'teacher' | 'student' | string; name?: string; classLevel?: string; batch?: string; firebaseUid?: string };

// backend returns { token, user }
export type LoginResponse = { token?: string; user?: User } | Record<string, unknown>;

export async function login(credentials: Credentials) {
	// expects backend to return { accessToken, user }
	const data = (await apiFetch('/api/auth/login', {
		method: 'POST',
		body: JSON.stringify(credentials),
	})) as LoginResponse;
						if (data && typeof data === 'object') {
				const rec = data as Record<string, unknown>;
				if ('token' in rec && typeof rec['token'] === 'string') {
					if (typeof window !== 'undefined') {
						// store as accessToken for existing client code
						localStorage.setItem('accessToken', rec['token'] as string);
										// store user with extra firebase fields if present
										localStorage.setItem('user', JSON.stringify((rec['user'] as User) ?? null));
					}
				}
			}
	return data;
}

export function logout() {
	try {
		if (typeof window !== 'undefined') {
			localStorage.removeItem('accessToken');
			localStorage.removeItem('user');
		}
	} catch {
		// ignore
	}
}

export function getToken() {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem('accessToken');
}

export function getUser(): User | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem('user');
		return raw ? (JSON.parse(raw) as User) : null;
	} catch {
		return null;
	}
}

export function setUser(user: User) {
	if (typeof window === 'undefined') return;
	localStorage.setItem('user', JSON.stringify(user));
}

// Admin-only: create user via backend
export async function adminCreateUser(payload: { name: string; email: string; password: string; role: 'admin' | 'teacher' | 'student'; classLevel?: string; batch?: string }) {
	const { apiFetch } = await import('./api');
	return apiFetch('/api/users', { method: 'POST', body: JSON.stringify(payload) });
}

// Get admin dashboard stats
export async function getAdminStats() {
	const { apiFetch } = await import('./api');
	return apiFetch('/api/users/dashboard');
}

// Validate token and retrieve current user from backend
export async function fetchMe() {
	const { apiFetch } = await import('./api');
	return apiFetch('/api/auth/me');
}
