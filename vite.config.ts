import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serve o app em /buildingyourhouse/
  base: process.env.GITHUB_PAGES ? '/buildingyourhouse/' : '/',
  plugins: [react()],
})
