import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server.ts', 'src/data-plugin.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
  splitting: false,
  external: ['vite'],
})
