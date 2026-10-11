import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { usePersistentState } from '@/lib/persist';

export type Profile = { name: string; phone: string; email: string; photo: string | null; referralCode: string; creditUsd: number };

const DEFAULT: Profile = { name: 'Albieri', phone: '', email: '', photo: null, referralCode: 'ALBIERI5', creditUsd: 0 };

type Ctx = { profile: Profile; update: (patch: Partial<Profile>) => void };

const ProfileContext = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = usePersistentState<Profile>('profile', DEFAULT);
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
