import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiError, AuthTokens } from '@sionmarket/contracts';

/**
 * SionMarket API client. Without EXPO_PUBLIC_API_URL the app runs in demo mode on the
 * bundled mock data, exactly as before, so it still works with no backend running.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
export const REALTIME_URL = process.env.EXPO_PUBLIC_REALTIME_URL?.replace(/\/$/, '') ?? API_URL.replace(/\/v1$/, '');
export const online = API_URL.length > 0;

const SESSION_KEY = 'sionmarket:session';

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type Session = Pick<AuthTokens, 'accessToken' | 'refreshToken' | 'user'>;
let session: Session | null = null;
const listeners = new Set<(s: Session | null) => void>();

export const getSession = () => session;

export function onSessionChange(listener: (s: Session | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function setSession(next: Session | null) {
  session = next;
  if (next) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
  else await AsyncStorage.removeItem(SESSION_KEY);
  listeners.forEach((l) => l(next));
}

export async function restoreSession() {
  const raw = await AsyncStorage.getItem(SESSION_KEY).catch(() => null);
  session = raw ? (JSON.parse(raw) as Session) : null;
  listeners.forEach((l) => l(session));
  return session;
}

async function raw<T>(method: string, path: string, body?: unknown, token?: string): Promise<{ status: number; data: T }> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, data: (text ? JSON.parse(text) : null) as T };
}

// Several requests can hit a 401 at once; they share one refresh.
let refreshing: Promise<boolean> | null = null;

async function refresh() {
  const current = session;
  if (!current) return false;
  refreshing ??= raw<AuthTokens>('POST', '/auth/refresh', { refreshToken: current.refreshToken })
    .then(async ({ status, data }) => {
      if (status !== 200) {
        await setSession(null);
        return false;
      }
      await setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      return true;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function api<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  let res = await raw<T | ApiError>(method, path, body, session?.accessToken);
  if (res.status === 401 && session && (await refresh())) {
    res = await raw<T | ApiError>(method, path, body, session?.accessToken);
  }
  if (res.status >= 400) {
    const err = res.data as ApiError | null;
    throw new ApiRequestError(res.status, err?.code ?? 'INTERNAL', err?.message ?? 'No pudimos conectar con SionMarket');
  }
  return res.data as T;
}

export const auth = {
  requestOtp: (phone: string) => api<{ sent: boolean }>('POST', '/auth/otp', { phone }),
  async verifyOtp(phone: string, code: string) {
    const tokens = await api<AuthTokens>('POST', '/auth/otp/verificar', { phone, code });
    await setSession({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: tokens.user });
    return tokens.user;
  },
  async logout() {
    if (session) await raw('POST', '/auth/logout', { refreshToken: session.refreshToken }).catch(() => {});
    await setSession(null);
  },
};
