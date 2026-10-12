import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // react-draggable reads this Node-only debug flag when a gesture starts.
  define: { 'process.env.DRAGGABLE_DEBUG': 'false' },
})
