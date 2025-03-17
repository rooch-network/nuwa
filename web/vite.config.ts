import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 3000
  },
  define: {
    'process.env.PACKAGE_ID': `"${process.env.VITE_PACKAGE_ID}"`,
  }, 
  optimizeDeps: {
    include: [
      'react-markdown',
      'remark-gfm',
      'react-syntax-highlighter',
      'react-syntax-highlighter/dist/esm/styles/prism',
      'zwitch',
      'mdast-util-to-markdown',
      'unist-util-stringify-position',
      'unist-util-visit',
      'unist-util-visit-parents',
      'unist-util-is'
    ],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
      // Ensure these packages are processed
      requireReturnsDefault: 'preferred'
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'markdown-vendor': ['react-markdown', 'remark-gfm', 'zwitch', 'mdast-util-to-markdown']
        }
      }
    },
    target: 'esnext',
    sourcemap: true,
    // Force Vite to bundle these dependencies
    modulePreload: {
      polyfill: true
    }
  }
})
