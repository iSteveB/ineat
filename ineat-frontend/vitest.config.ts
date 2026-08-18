import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    // Keep interactive UI tests responsive when the complete suite runs on
    // machines with many logical CPUs. Vitest's percentage-based defaults can
    // otherwise start enough Happy DOM workers to make 5-second tests time out.
    minWorkers: 1,
    maxWorkers: 4,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.test.{ts,tsx}',
        'src/routeTree.gen.ts',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        statements: 37,
        branches: 70,
        functions: 49,
        lines: 37,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
