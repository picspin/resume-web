import { useCallback, useEffect, useState } from 'react';
import { readApplicationState, updateApplicationRecord, writeApplicationState } from './applicationState.js';

export function useApplicationState(storage = window.localStorage) {
  const [applicationState, setApplicationState] = useState(() => readApplicationState(storage));

  useEffect(() => {
    writeApplicationState(storage, applicationState);
  }, [applicationState, storage]);

  const updateRecord = useCallback((slug, patch) => {
    setApplicationState((current) => updateApplicationRecord(current, slug, patch));
  }, []);

  return { applicationState, updateRecord };
}
