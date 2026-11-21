import { defineConfig } from 'vite'
import solid from '@solidjs/vite-plugin'

export default defineConfig({
  plugins: [solid()],
  server: { port: 5173 },
  // motion-solid is consumed from its build output (run `pnpm build` at the repo root
  // first; `pnpm dev` there rebuilds on change).
  optimizeDeps: { exclude: ['motion-solid'] },
})
