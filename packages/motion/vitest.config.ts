import { defineConfig } from 'vitest/config'
import solid from '@solidjs/vite-plugin'
import path from 'node:path'

export default defineConfig({
  plugins: [solid()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
})
