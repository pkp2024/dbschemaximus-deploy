'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getPersistenceMode,
  PERSISTENCE_MODE_CHANGED_EVENT,
  PERSISTENCE_MODE_STORAGE_KEY,
  setPersistenceMode,
  type PersistenceMode,
} from '@/lib/persistence/mode';

export function usePersistenceMode() {
  const [mode, setModeState] = useState<PersistenceMode>('frontend');

  useEffect(() => {
    setModeState(getPersistenceMode());

    const handleModeChanged = () => {
      setModeState(getPersistenceMode());
    };

    const handleStorageChanged = (event: StorageEvent) => {
      if (event.key === PERSISTENCE_MODE_STORAGE_KEY) {
        setModeState(getPersistenceMode());
      }
    };

    window.addEventListener(PERSISTENCE_MODE_CHANGED_EVENT, handleModeChanged);
    window.addEventListener('storage', handleStorageChanged);

    return () => {
      window.removeEventListener(PERSISTENCE_MODE_CHANGED_EVENT, handleModeChanged);
      window.removeEventListener('storage', handleStorageChanged);
    };
  }, []);

  const setMode = useCallback((nextMode: PersistenceMode) => {
    setPersistenceMode(nextMode);
    setModeState(nextMode);
  }, []);

  return { mode, setMode };
}
