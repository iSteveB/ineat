import '@testing-library/jest-dom';
import { vi, beforeAll, afterEach } from 'vitest';

// Configuration pour supprimer les warnings de console pendant les tests
beforeAll(() => {
	console.error = vi.fn();
	console.warn = vi.fn();
});

// Nettoyage après chaque test
afterEach(() => {
	vi.clearAllMocks();
});
