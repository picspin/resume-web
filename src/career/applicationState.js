export const CAREER_STORAGE_KEY = 'resumeOps.applications.v1';
export const DEFAULT_STATUS = 'generated';

export function readApplicationState(storage = window.localStorage) {
  if (!storage) return {};
  try {
    const raw = storage.getItem(CAREER_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function writeApplicationState(storage = window.localStorage, state = {}) {
  if (!storage) return;
  storage.setItem(CAREER_STORAGE_KEY, JSON.stringify(state));
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
