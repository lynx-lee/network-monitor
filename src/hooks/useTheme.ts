import { useMemo, useEffect, useState } from 'react';
import useConfigStore from '../store/configStore';

/**
 * Shared hook for resolving the current theme.
 * Listens to system preference changes when theme is set to 'system'.
 */
const useTheme = (): 'light' | 'dark' => {
  const configTheme = useConfigStore((s) => s.theme);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    if (configTheme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [configTheme]);

  return useMemo(() => {
    if (configTheme === 'system') return systemDark ? 'dark' : 'light';
    return configTheme;
  }, [configTheme, systemDark]);
};

export default useTheme;
