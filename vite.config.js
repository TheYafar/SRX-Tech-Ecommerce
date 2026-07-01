import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    proxy: {
      // Forward PHP email bridge to the production server during local dev.
      // Vite cannot execute PHP — without this proxy it serves the raw .php
      // file as plain text, causing "Unexpected token '<'" JSON parse errors.
      '/send-email.php': {
        target: 'https://srxtech.net',
        changeOrigin: true,
        secure: true,
      },
      '/send-coupon-email.php': {
        target: 'https://srxtech.net',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})

