/**
 * ============================================================================
 * Configuration: Vite Build Tool
 * Description: 
 * Configures the React development server, including host exposure for 
 * Docker containerization and polling for hot-module replacement (HMR) 
 * in virtualized environments.
 * ============================================================================
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Required for Docker to expose the port
    port: 5173,
    watch: {
      usePolling: true, // Guarantees that code changes reflect in the Docker container
    }
  }
})