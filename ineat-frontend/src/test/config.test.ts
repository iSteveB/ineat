import { describe, it, expect, vi } from 'vitest';

describe('Configuration Vitest', () => {
  it('vérifie que la configuration fonctionne correctement', () => {
    // Arrangement
    const a = 1;
    const b = 2;
    
    // Action
    const somme = a + b;
    
    // Assertion
    expect(somme).toBe(3);
  });

  it('permet d\'utiliser les matchers de jest-dom', () => {
    // Création d'un élément DOM pour le test
    document.body.innerHTML = '<div id="test">Test</div>';
    
    // Sélection de l'élément
    const element = document.getElementById('test');
    
    // Vérification avec les matchers de jest-dom
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Test');
  });

  it('supporte les fonctions de mock', () => {
    // Création d'une fonction mock
    const mockFn = vi.fn(() => 'test');
    
    // Appel de la fonction
    const result = mockFn();
    
    // Vérification que la fonction a été appelée
    expect(mockFn).toHaveBeenCalled();
    expect(result).toBe('test');
  });
});