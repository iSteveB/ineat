import path from 'path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import fs from 'fs';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import os from 'os';

const homedir = os.homedir()

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
		https: {
			key: fs.readFileSync(
				path.resolve(homedir, '.cert/localhost+2-key.pem')
			),
			cert: fs.readFileSync(
				path.resolve(homedir, '.cert/localhost+2.pem')
			),
		},
		watch: {
			usePolling: true, // Important pour Docker
		},
	},
});
