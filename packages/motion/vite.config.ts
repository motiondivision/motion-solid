import { defineConfig } from 'vite'
import solid from '@solidjs/vite-plugin'
import dts from 'vite-plugin-dts'
import path from 'node:path'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  plugins: [
    solid(),
    dts({
      outDir: 'dist/es',
      exclude: ['src/**/__tests__/**', 'src/**/story/**'],
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  build: {
    minify: false,
    lib: {
      entry: path.resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es'],
    },
    rolldownOptions: {
      external: [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.peerDependencies || {}),
        /^solid-js(\/.*)?$/,
        /^@solidjs\/.*/,
        'framer-motion/dom',
      ],
      output: {
        format: 'es',
        entryFileNames: '[name].mjs',
        dir: './dist/es',
        exports: 'named',
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
  },
})
