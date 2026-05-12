import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  dts: true,
  clean: false,
  sourcemap: true,
  target: 'es2022',
  splitting: false,
  external: ['vite', '@preact/preset-vite'],
})
