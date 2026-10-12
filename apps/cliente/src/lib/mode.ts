import { router, type Href } from 'expo-router';

import { useProfile, type Profile } from '@/store/profile';

// One app, three faces. A restaurant account lands in its business panel and an admin in the
// back office; both can still switch to shopping as a customer.
export type Mode = NonNullable<Profile['mode']>;

export const MODE_HOME: Record<Mode, Href> = { cliente: '/(tabs)', restaurante: '/negocio', admin: '/admin' };

export const MODE_LABEL: Record<Mode, string> = { cliente: 'Modo cliente', restaurante: 'Panel del restaurante', admin: 'Administración' };

export function modesFor(roles?: string[]): Mode[] {
  if (roles?.includes('admin')) return ['admin', 'restaurante', 'cliente'];
  if (roles?.includes('restaurante')) return ['restaurante', 'cliente'];
  return ['cliente'];
}

export function useMode() {
  const { profile, update } = useProfile();
  const modes = modesFor(profile.roles);
  const mode = profile.mode && modes.includes(profile.mode) ? profile.mode : modes[0]!;
  const setMode = (next: Mode) => {
    update({ mode: next });
    router.replace(MODE_HOME[next]);
  };
  return { mode, modes, setMode, rolesKnown: !!profile.roles };
}
