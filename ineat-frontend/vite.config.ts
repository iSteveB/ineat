import path from 'path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
		react(),
		tailwindcss(),
	],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true  // Important pour Docker
    }
  }
});
