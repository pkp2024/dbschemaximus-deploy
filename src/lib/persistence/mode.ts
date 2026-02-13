export type PersistenceMode = 'frontend' | 'backend';

export const PERSISTENCE_MODE_STORAGE_KEY = 'drawsql.persistence.mode';
export const PERSISTENCE_MODE_CHANGED_EVENT = 'drawsql:persistence-mode-changed';

export function isPersistenceMode(value: string): value is PersistenceMode {
  return value === 'frontend' || value === 'backend';
}

export function getPersistenceMode(): PersistenceMode {
  if (typeof window === 'undefined') {
    return 'frontend';
  }

  const raw = window.localStorage.getItem(PERSISTENCE_MODE_STORAGE_KEY);
  return raw && isPersistenceMode(raw) ? raw : 'frontend';
}

export function setPersistenceMode(mode: PersistenceMode): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(PERSISTENCE_MODE_STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent<PersistenceMode>(PERSISTENCE_MODE_CHANGED_EVENT, { detail: mode }));
}
