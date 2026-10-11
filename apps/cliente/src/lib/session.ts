import { useEffect, useState } from 'react';

import { getSession, onSessionChange } from '@/lib/api';

export function useSession() {
  const [session, setSession] = useState(getSession());
  useEffect(() => onSessionChange(setSession), []);
  return session;
}
