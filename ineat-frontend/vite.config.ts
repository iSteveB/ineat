import path from 'path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import fs from 'fs';
import { homedir } from 'os';
import type { ServerOptions } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	const isProduction = mode === 'production';
	const isDevelopment = mode === 'development';

	// Configuration HTTPS uniquement en développement
	let httpsConfig: ServerOptions['https'] = undefined;

	if (isDevelopment) {
		try {
			const keyPath = path.resolve(homedir(), 'localhost+3-key.pem');
			const certPath = path.resolve(homedir(), 'localhost+3.pem');

			// Vérifier que les certificats existent avant de les utiliser
			if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
				httpsConfig = {
					key: fs.readFileSync(keyPath),
					cert: fs.readFileSync(certPath),
				};
				console.log('🔒 HTTPS certificates loaded for development');
			} else {
				console.log(
					'⚠️ HTTPS certificates not found, using HTTP in development'
				);
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error';
			console.log(
				'⚠️ Failed to load HTTPS certificates, using HTTP:',
				errorMessage
			);
		}
	}

	return {
		plugins: [
			tanstackRouter({	
				routesDirectory: './src/routes',
				generatedRouteTree: './src/routeTree.gen.ts',
				autoCodeSplitting: true,
			}),
			react(),
			tailwindcss(),
		],

		// Configuration du serveur de développement
		server: {
			https: httpsConfig,
			host: '0.0.0.0',
			port: 5173,
			strictPort: false,
		},

		// Configuration de preview (production locale)
		preview: {
			host: '0.0.0.0',
			port: 4173,
			strictPort: false,
		},

		// Résolution des chemins
		resolve: {
			alias: {
				'@': path.resolve(__dirname, './src'),
			},
		},

		// Configuration du build
		build: {
			target: 'esnext',
			outDir: 'dist',
			assetsDir: 'assets',
			sourcemap: !isProduction,
			minify: isProduction ? 'esbuild' : false,
			rollupOptions: {
				output: {
					manualChunks: {
						vendor: ['react', 'react-dom'],
						router: ['@tanstack/react-router'],
						query: ['@tanstack/react-query'],
						auth: ['better-auth/react'],
						forms: ['@hookform/resolvers', 'react-hook-form', 'zod'],
						calendar: ['date-fns', 'react-day-picker'],
						ui: ['cmdk', 'lucide-react', 'sonner'],
						radix: [
							'@radix-ui/react-accordion',
							'@radix-ui/react-alert-dialog',
							'@radix-ui/react-avatar',
							'@radix-ui/react-dialog',
							'@radix-ui/react-dropdown-menu',
							'@radix-ui/react-label',
							'@radix-ui/react-popover',
							'@radix-ui/react-progress',
							'@radix-ui/react-radio-group',
							'@radix-ui/react-select',
							'@radix-ui/react-separator',
							'@radix-ui/react-slot',
							'@radix-ui/react-switch',
						],
					},
				},
			},
		},
		appType: 'spa',

		// Variables d'environnement
		define: {
			__APP_VERSION__: JSON.stringify(
				process.env.npm_package_version || '1.0.0'
			),
			__BUILD_TIME__: JSON.stringify(new Date().toISOString()),
		},

		// Configuration CSS
		css: {
			postcss: './postcss.config.js',
		},

		// Optimisations pour le développement
		optimizeDeps: {
			include: [
				'react',
				'react-dom',
				'@tanstack/react-router',
				'@tanstack/react-query',
				'zustand',
			],
		},
	};
});
