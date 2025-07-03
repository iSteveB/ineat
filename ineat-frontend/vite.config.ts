import path from 'path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import fs from 'fs';
import os from 'os';

const homedir = os.homedir()

export default defineConfig({
	plugins: [
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
				path.resolve(homedir, './localhost+3-key.pem')
			),
			cert: fs.readFileSync(
				path.resolve(homedir, './localhost+3.pem')
			),
		},
		watch: {
			usePolling: true, // Important pour Docker
		},
	},
});
