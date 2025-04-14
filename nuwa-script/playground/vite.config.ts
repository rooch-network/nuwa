import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // optimizeDeps: { // Removed - should no longer be needed after fixing nuwa-script exports
  //   include: ['nuwa-script'],
  // },
})
