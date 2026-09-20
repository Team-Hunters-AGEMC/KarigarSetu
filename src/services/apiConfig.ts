const envApiBase = (import.meta as any).env?.VITE_API_BASE_URL as
  | string
  | undefined;

export const API_BASE =
  envApiBase?.replace(/\/$/, '') || 'http://127.0.0.1:5000';

export const apiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
};
const originalFetch = window.fetch.bind(window);

export const installApiFetchInterceptor = (): void => {
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (
      typeof input === 'string' &&
      (input === '/api' || input.startsWith('/api/'))
    ) {
      return originalFetch(apiUrl(input), init);
    }

    return originalFetch(input, init);
  }) as typeof window.fetch;
};