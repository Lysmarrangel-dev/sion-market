import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';

// useState that survives app restarts (RF-C04: cart persists between sessions).
// Cross-device sync needs the backend; until then this is per device.
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(`sionmarket:${key}`)
      .then((raw) => {
        if (raw != null) setValue(JSON.parse(raw) as T);
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
        setHydrated(true);
      });
  }, [key]);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(`sionmarket:${key}`, JSON.stringify(value)).catch(() => {});
  }, [key, value]);

  return [value, setValue, hydrated] as const;
}
