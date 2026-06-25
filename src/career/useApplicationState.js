import { useCallback, useEffect, useState } from 'react';
import {
  readApplicationState,
  resolveApplicationStorage,
  updateApplicationRecord,
  writeApplicationState,
} from './applicationState.js';

export function useApplicationState(storage) {
  const resolvedStorage = resolveApplicationStorage(storage);
  const [applicationState, setApplicationState] = useState(() => readApplicationState(resolvedStorage));

  useEffect(() => {
    writeApplicationState(resolvedStorage, applicationState);
  }, [applicationState, resolvedStorage]);

  const updateRecord = useCallback((slug, patch) => {
    setApplicationState((current) => updateApplicationRecord(current, slug, patch));
  }, []);

  return { applicationState, updateRecord };
}
