export const CAREER_STORAGE_KEY = 'resumeOps.applications.v1';
export const DEFAULT_STATUS = 'generated';

export function resolveApplicationStorage(storage) {
  if (storage) return storage;
  if (typeof window !== 'undefined') {
    try {
      return window.localStorage || null;
    } catch {
      return null;
    }
  }
  return null;
}

export function readApplicationState(storage) {
  const resolvedStorage = resolveApplicationStorage(storage);
  if (!resolvedStorage) return {};
  try {
    const raw = resolvedStorage.getItem(CAREER_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function writeApplicationState(storage, state = {}) {
  const resolvedStorage = resolveApplicationStorage(storage);
  if (!resolvedStorage) return;
  try {
    resolvedStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota and availability errors.
  }
}

export function updateApplicationRecord(state = {}, slug, patch = {}, now = new Date().toISOString()) {
  if (!slug) return state;
  return {
    ...state,
    [slug]: {
      status: DEFAULT_STATUS,
      ...state[slug],
      ...patch,
      updatedAt: now,
    },
  };
}
