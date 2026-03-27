import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GITHUB_PAGES=true → repo-relative base for GitHub Pages CI.
  // CAPACITOR=true    → relative './' for iOS WKWebView bundle (file:// origin).
  // Default '/'       → local dev and Docker.
  base: process.env.GITHUB_PAGES === 'true'
    ? '/Resident-blackjack/'
    : process.env.CAPACITOR === 'true'
      ? './'
      : '/',
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
