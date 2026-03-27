import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // When GITHUB_PAGES=true (set in CI), use the repo name as base path.
  // Locally and in Docker it stays '/' so nothing breaks.
  base: process.env.GITHUB_PAGES === 'true' ? '/Resident-blackjack/' : '/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**'],
      reporter: ['text', 'lcov'],
    },
  },
})
