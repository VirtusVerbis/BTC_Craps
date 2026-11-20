import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/binance-api': {
        target: 'https://api.binance.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/binance-api/, ''),
      },
      '/binance-fapi': {
        target: 'https://fapi.binance.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/binance-fapi/, ''),
      },
      '/bybit-api': {
        target: 'https://api.bybit.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bybit-api/, ''),
      },
      '/okx-api': {
        target: 'https://www.okx.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/okx-api/, ''),
      },
      '/kraken-api': {
        target: 'https://api.kraken.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kraken-api/, ''),
      },
      '/coinbase-api': {
        target: 'https://api.exchange.coinbase.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/coinbase-api/, ''),
      },
      /** Optional same-origin WS proxy if you set `VITE_BINANCE_WS_URL` to `/ws-binance/...`. */
      '/ws-binance': {
        target: 'wss://stream.binance.com:9443',
        changeOrigin: true,
        ws: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/ws-binance/, ''),
      },
      /** Same-origin Coinbase Exchange feed (avoids dev aborts on direct `wss://ws-feed…`). */
      '/ws-coinbase': {
        target: 'wss://ws-feed.exchange.coinbase.com',
        changeOrigin: true,
        ws: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/ws-coinbase/, ''),
      },
      /** Coinalyze snapshot from `npm run oi:dev` (wrangler on port 8787). */
      '/oi': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
})
