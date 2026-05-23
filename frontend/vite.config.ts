import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { compression } from 'vite-plugin-compression2'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    compression({ algorithms: ['gzip', 'brotliCompress'] })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@ims-pro/shared": path.resolve(__dirname, "../packages/shared/src/index.ts"),
    },
  },
})
