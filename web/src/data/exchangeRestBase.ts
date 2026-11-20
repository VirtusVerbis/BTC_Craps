/**
 * Browser: same-origin paths (Vite dev proxy or worker edge proxy).
 * Vitest/SSR: direct exchange origins (no CORS in Node).
 */
export const exchangeRestBase = (proxyPrefix: string, prodOrigin: string): string =>
  typeof window !== 'undefined' ? proxyPrefix : prodOrigin