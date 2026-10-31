import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/** Served from https://link-page.github.io/JACOBSBARBERSHOPNISYONI/ (GitHub Pages project site). */
const base = '/JACOBSBARBERSHOPNISYONI/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      // Two pages: the customer app and the staff admin (/admin/), bundled separately.
      input: {
        main: path.resolve(import.meta.dirname, 'index.html'),
        admin: path.resolve(import.meta.dirname, 'admin/index.html'),
      },
      output: {
        // Long-lived vendor chunks: app updates don't invalidate the framework cache.
        advancedChunks: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'ui', test: /node_modules[\\/](vaul|@radix-ui|lucide-react|tailwind-merge|clsx|class-variance-authority)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'supabase/functions/_shared/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
