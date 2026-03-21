import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // GitHub Pages serves from  https://<user>.github.io/<repo>/
  // The base must match your repository name exactly.
  // If your repo is called "crypto_api", use '/crypto_api/'
  base: '/crypto_api/',
})