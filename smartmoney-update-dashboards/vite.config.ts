
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carga variables de entorno según el modo (development/production)
  // FIX: Cast process to any to avoid "Property 'cwd' does not exist on type 'Process'" error
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
    },
    define: {
      // Define process.env.API_KEY para que esté disponible en el código cliente
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY)
    },
    build: {
      rollupOptions: {
        // Marca @google/genai como externa para no empaquetarla
        // El navegador la resolverá usando el importmap en index.html
        external: ['@google/genai']
      }
    }
  };
});