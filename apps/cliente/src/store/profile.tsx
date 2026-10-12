import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

import { api, getSession, onSessionChange, online } from '@/lib/api';
import { usePersistentState } from '@/lib/persist';

export type Profile = {
  name: string;
  phone: string;
  email: string;
  photo: string | null;
  referralCode: string;
  creditUsd: number;
  /** Account roles from the API (cliente, restaurante, repartidor, admin). */
  roles?: string[];
};

const DEMO: Profile = { name: 'Albieri', phone: '', email: '', photo: null, referralCode: 'ALBIERI5', creditUsd: 0 };
const EMPTY: Profile = { name: '', phone: '', email: '', photo: null, referralCode: '', creditUsd: 0 };

type Me = { name: string | null; phone: string | null; email: string | null; photoUrl: string | null; roles: string[] };

type Ctx = { profile: Profile; update: (patch: Partial<Profile>) => void };

const ProfileContext = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  // Own key online so a profile saved by the old demo build never shows up for a real account.
  const [profile, setProfile, hydrated] = usePersistentState<Profile>(online ? 'perfil' : 'profile', online ? EMPTY : DEMO);

  // Online the profile is the signed-in account's: from our API, falling back to what Supabase knows.
  useEffect(() => {
    if (!online || !hydrated) return;
    const sync = (s: ReturnType<typeof getSession>) => {
      if (!s) return setProfile(EMPTY);
      setProfile((p) => ({ ...p, name: p.name || s.user.name || '', email: s.user.email ?? p.email, phone: s.user.phone ?? p.phone }));
      api<Me>('GET', '/yo')
        .then((me) =>
          setProfile((p) => ({
            ...p,
            name: me.name || s.user.name || p.name,
            email: me.email ?? p.email,
            phone: me.phone ?? p.phone,
            photo: me.photoUrl ?? p.photo,
            roles: me.roles,
          })),
        )
        .catch(() => {});
    };
    sync(getSession());
    return onSessionChange(sync);
  }, [hydrated, setProfile]);
  const value = useMemo<Ctx>(
    () => ({ profile, update: (patch) => setProfile((prev) => ({ ...prev, ...patch })) }),
    [profile, setProfile],
  );
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}
