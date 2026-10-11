import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiError } from '@sionmarket/contracts';
import { createClient, type Session as SupabaseSession } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { AppState, Platform } from 'react-native';

/**
 * SionMarket API client. Without EXPO_PUBLIC_API_URL the app runs in demo mode on the
 * bundled mock data, exactly as before, so it still works with no backend running.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
export const REALTIME_URL = process.env.EXPO_PUBLIC_REALTIME_URL?.replace(/\/$/, '') ?? API_URL.replace(/\/v1$/, '');
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const online = API_URL.length > 0 && SUPABASE_URL.length > 0;
if (API_URL && !online) console.warn('EXPO_PUBLIC_SUPABASE_URL falta: la app sigue en modo demo.');

/**
 * Sign-in is handled by Supabase Auth (same project as the website). The API only checks
 * the Supabase access token; roles and profile live in our own backend.
 */
export const supabase = online
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // On web the browser's localStorage is used; AsyncStorage touches `window` during static render.
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Same key as the website, so signing in on www.sionmarket.app also signs in the web app.
        storageKey: 'sionmarket-auth',
        // On web, Google sends the user back to /app with the session in the URL.
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;

// Refresh tokens only while the app is in the foreground, as Supabase recommends for React Native.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type Session = { accessToken: string; user: { id: string; phone?: string; email?: string; name?: string } };
let session: Session | null = null;
const listeners = new Set<(s: Session | null) => void>();

export const getSession = () => session;

export function onSessionChange(listener: (s: Session | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function apply(next: SupabaseSession | null) {
  session = next
    ? {
        accessToken: next.access_token,
        user: {
          id: next.user.id,
          phone: next.user.phone,
          email: next.user.email,
          // Accounts made on the website carry `nombre`; Google ones carry `full_name`.
          name: next.user.user_metadata?.nombre ?? (String(next.user.user_metadata?.full_name ?? '').split(' ')[0] || undefined),
        },
      }
    : null;
  listeners.forEach((l) => l(session));
}

supabase?.auth.onAuthStateChange((event, next) => {
  if (event !== 'INITIAL_SESSION') apply(next);
});

export async function restoreSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  apply(data.session);
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

export async function api<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  let res = await raw<T | ApiError>(method, path, body, session?.accessToken);
  if (res.status === 401 && session && supabase) {
    // The token may have expired while the app slept: refresh once and retry.
    const { data } = await supabase.auth.refreshSession();
    if (data.session) res = await raw<T | ApiError>(method, path, body, data.session.access_token);
  }
  if (res.status >= 400) {
    const err = res.data as ApiError | null;
    throw new ApiRequestError(res.status, err?.code ?? 'INTERNAL', err?.message ?? 'No pudimos conectar con SionMarket');
  }
  return res.data as T;
}

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Correo o clave incorrectos.',
  email_not_confirmed: 'Confirma tu correo con el enlace que te enviamos y vuelve a intentar.',
  user_already_exists: 'Ya existe una cuenta con ese correo. Entra con tu clave.',
  weak_password: 'Esa clave es muy débil. Usa al menos 6 caracteres.',
  otp_expired: 'El código no es válido o ya venció.',
  over_request_rate_limit: 'Demasiados intentos. Espera un momento y vuelve a intentar.',
  over_sms_send_rate_limit: 'Demasiados intentos. Espera un momento y vuelve a intentar.',
  over_email_send_rate_limit: 'Demasiados intentos. Espera un momento y vuelve a intentar.',
  phone_provider_disabled: 'Todavía no podemos enviar SMS. Entra con tu correo mientras tanto.',
  provider_disabled: 'El acceso con Google todavía no está activo. Entra con tu correo mientras tanto.',
  validation_failed: 'El acceso con Google todavía no está activo. Entra con tu correo mientras tanto.',
  sms_send_failed: 'No pudimos enviar el SMS. Revisa el número o entra con tu correo.',
};

/** Turns Supabase's error codes into something a customer can act on. */
function authError(e: { code?: string; status?: number } | null) {
  if (!e) return;
  throw new ApiRequestError(e.status ?? 400, 'AUTH', AUTH_MESSAGES[e.code ?? ''] ?? 'No pudimos iniciar sesión. Revisa tu conexión.');
}

export const auth = {
  async requestOtp(phone: string) {
    const { error } = await supabase!.auth.signInWithOtp({ phone });
    authError(error);
  },
  async verifyOtp(phone: string, token: string) {
    const { data, error } = await supabase!.auth.verifyOtp({ phone, token, type: 'sms' });
    authError(error);
    apply(data.session);
  },
  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
    authError(error);
    apply(data.session);
  },
  async signUpWithEmail(email: string, password: string) {
    const { data, error } = await supabase!.auth.signUp({ email, password });
    authError(error);
    if (data.session) apply(data.session);
    return { needsConfirmation: !data.session };
  },
  /**
   * Google sign-in. On web the page leaves for Google and comes back to /app, where the
   * Supabase client reads the session from the URL. On the phone it opens an auth browser
   * and returns to the sionmarket:// scheme with the tokens. Returns false if cancelled.
   */
  async signInWithGoogle() {
    if (Platform.OS === 'web') {
      // The web build lives under /app on www.sionmarket.app; locally it is served at the root.
      const base = window.location.pathname.startsWith('/app') ? '/app' : '';
      const { error } = await supabase!.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}${base}` },
      });
      authError(error);
      return true;
    }
    const redirectTo = Linking.createURL('/');
    const { data, error } = await supabase!.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    authError(error);
    const result = await WebBrowser.openAuthSessionAsync(data.url!, redirectTo);
    if (result.type !== 'success') return false;
    const params = new URLSearchParams(result.url.split('#')[1] ?? result.url.split('?')[1] ?? '');
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (params.get('error') || !access_token || !refresh_token) {
      throw new ApiRequestError(400, 'AUTH', params.get('error_description') ?? 'No pudimos entrar con Google.');
    }
    const next = await supabase!.auth.setSession({ access_token, refresh_token });
    authError(next.error);
    apply(next.data.session);
    return true;
  },
  async logout() {
    if (supabase) await supabase.auth.signOut().catch(() => {});
    apply(null);
  },
};
