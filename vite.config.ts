import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-antd': ['antd', '@ant-design/icons'],
          'vendor-reactflow': ['reactflow'],
          'vendor-recharts': ['recharts'],
          'vendor-i18n': ['i18next', 'react-i18next'],
          'vendor-network': ['socket.io-client', 'axios', 'zustand'],
        },
      },
    },
  },
})
