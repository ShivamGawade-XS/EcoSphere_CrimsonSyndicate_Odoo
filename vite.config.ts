import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Raise the warning threshold to suppress false-positive large-chunk warnings
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split vendor code into separate chunks for better caching
        manualChunks: {
          // React core runtime
          'vendor-react': ['react', 'react-dom'],
          // Chart library (large — keep isolated so it can be cached independently)
          'vendor-recharts': ['recharts'],
          // PDF/Excel export utilities (only loaded on Reports page)
          'vendor-export': ['jspdf', 'html2canvas', 'xlsx'],
          // Radix UI primitives (shared across all features)
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
          ],
        },
      },
    },
  },
})
