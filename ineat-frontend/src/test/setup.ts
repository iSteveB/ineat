import '@testing-library/jest-dom';
import { vi, beforeAll, afterEach, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

// Démarrer le serveur MSW avant tous les tests
beforeAll(() => {
  server.listen();
  
  // Configuration pour supprimer les warnings de console pendant les tests
  console.error = vi.fn();
  console.warn = vi.fn();
});

// Reset les handlers après chaque test pour isoler les tests
afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.clearAllMocks();
});

// Fermer le serveur après tous les tests
afterAll(() => {
  server.close();
});