import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { careerOpsRuntimePlugin } from './scripts/dev/career-runtime.mjs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), careerOpsRuntimePlugin()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
