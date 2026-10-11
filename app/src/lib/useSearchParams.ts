import { useCallback, useMemo, useSyncExternalStore } from 'react';

const URL_CHANGE = 'urlchange';

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(URL_CHANGE, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(URL_CHANGE, onChange);
  };
}

const getSearch = () => window.location.search;

export interface NavigateOptions {
  replace?: boolean;
}

export function useSearchParams() {
  const search = useSyncExternalStore(subscribe, getSearch);
  const params = useMemo(() => new URLSearchParams(search), [search]);

  const setParams = useCallback((next: URLSearchParams, options: NavigateOptions = {}) => {
    const query = next.toString();
    const url = window.location.pathname + (query ? `?${query}` : '') + window.location.hash;
    if (url === window.location.pathname + window.location.search + window.location.hash) return;

    if (options.replace) {
      window.history.replaceState(null, '', url);
    } else {
      window.history.pushState(null, '', url);
    }
    window.dispatchEvent(new Event(URL_CHANGE));
  }, []);

  return [params, setParams] as const;
}
