import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { getSession, online } from '@/lib/api';
import { useSession } from '@/lib/session';

/** True when the web app is served under /app on www.sionmarket.app, next to the website. */
const onWebsite = () => Platform.OS === 'web' && typeof window !== 'undefined' && /^\/app(\/|$)/.test(window.location.pathname);

/**
 * Sends the visitor to sign in and returns false, or returns true when they may go on.
 * Browsing restaurants is open to everyone; anything that acts (cart, orders, profile…) asks first.
 * On the website the sign-in is the site's own page, which brings them back to this screen.
 */
export function requireLogin(): boolean {
  if (!online || getSession()) return true;
  if (onWebsite()) {
    const back = window.location.pathname.replace(/^\//, '').replace(/\/$/, '') || 'app';
    window.location.assign(`/login.html?siguiente=${encodeURIComponent(back)}`);
  } else {
    router.push('/login');
  }
  return false;
}

/** For screens that only make sense signed in: redirects on mount; true once allowed. */
export function useRequireLogin() {
  const session = useSession();
  const allowed = !online || !!session;
  useEffect(() => {
    if (!allowed) requireLogin();
  }, [allowed]);
  return allowed;
}

/** The web app's own sign-in screens hand over to the website's sign-in page. */
export function useWebsiteLogin() {
  useEffect(() => {
    if (online && onWebsite()) window.location.replace('/login.html?siguiente=app');
  }, []);
}

/** After signing out on the website, go back to its home page. */
export function afterLogout() {
  if (onWebsite()) window.location.assign('/');
  else router.replace('/login');
}
