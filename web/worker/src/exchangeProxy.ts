/** Same-origin REST proxies for exchange APIs (CORS-safe in the browser). */
const PROXY_TARGETS: Record<string, string> = {
  '/binance-api': 'https://api.binance.com',
  '/binance-fapi': 'https://fapi.binance.com',
  '/bybit-api': 'https://api.bybit.com',
  '/okx-api': 'https://www.okx.com',
  '/kraken-api': 'https://api.kraken.com',
  '/coinbase-api': 'https://api.exchange.coinbase.com',
}

export const matchExchangeProxyPrefix = (pathname: string): string | null => {
  for (const prefix of Object.keys(PROXY_TARGETS)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return prefix
  }
  return null
}

export const fetchExchangeProxy = async (request: Request): Promise<Response> => {
  const url = new URL(request.url)
  const prefix = matchExchangeProxyPrefix(url.pathname)
  if (!prefix) return new Response('not found', { status: 404 })
  const upstream = PROXY_TARGETS[prefix]! + url.pathname.slice(prefix.length) + url.search
  const headers = new Headers(request.headers)
  headers.delete('host')
  const init: RequestInit = {
    method: request.method,
    headers,
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body
  }
  const res = await fetch(upstream, init)
  const out = new Headers(res.headers)
  out.set('access-control-allow-origin', '*')
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out })
}