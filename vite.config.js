import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { careerOpsRuntimePlugin } from './scripts/dev/career-runtime.mjs'
import { publicBuildPlugin } from './scripts/build/public-build.mjs'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode, isPreview }) => ({
  base: loadEnv(mode, process.cwd(), '').VITE_BASE_PATH || (command === 'build' || isPreview ? '/resume-web/' : '/'),
  publicDir: command === 'build' ? false : 'public',
  define: { 'import.meta.env.VITE_PRIVATE_WORKSPACE': JSON.stringify(mode === 'private' ? 'true' : 'false') },
  plugins: [react(), careerOpsRuntimePlugin(), publicBuildPlugin()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: mode === 'private' ? 'dist-private' : 'dist',
    sourcemap: false,
    emptyOutDir: true
  }
}))
