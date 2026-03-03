import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno (VITE_...)
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    // IMPORTANTE: Esto asegura que al subir a Firebase, busque los archivos en la raíz
    base: '/', 
    define: {
      // Esto permite que el servicio de Gemini lea la clave sin error de 'process is not defined'
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
      'process.env.SUPER_ADMIN_EMAIL': JSON.stringify(env.VITE_SUPER_ADMIN_EMAIL),
    },
    build: {
      // Configuraciones extra para asegurar un build limpio
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
    }
  }
})