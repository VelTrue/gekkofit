// Сборка живых экранов: один файл app.js (IIFE), чтобы страница открывалась прямо с диска (file://).
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const here = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  base: './',
  publicDir: fileURLToPath(new URL('../public', import.meta.url)),
  plugins: [react(), tailwindcss()],
  resolve: { alias: { 'virtual:pwa-register/react': fileURLToPath(new URL('./pwa-stub.ts', import.meta.url)) } },
  build: {
    outDir: process.env.HARNESS_OUT,
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: { entry: fileURLToPath(new URL('./harness.tsx', import.meta.url)), name: 'GekkoMapApp', formats: ['iife'], fileName: () => 'app.js', cssFileName: 'app' },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  define: { 'process.env.NODE_ENV': '"production"' },
})
