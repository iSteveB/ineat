import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SocialCallback from './SocialCallback';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import userEvent from '@testing-library/user-event';

// Mocks pour les dépendances
vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
  useSearch: vi.fn()
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn()
}));

vi.mock('../ui/spinner', () => ({
  default: () => <div data-testid="mocked-spinner">Loading...</div>
}));

describe('SocialCallback', () => {
  // Préparation des mocks
  const navigateMock = vi.fn();
  const getProfileMock = vi.fn();
  const user = userEvent.setup();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Configuration des mocks par défaut
    (useNavigate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(navigateMock);
    (useSearch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({});
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      getProfile: getProfileMock
    });
  });
  
  it('affiche un spinner pendant le traitement', () => {
    // Simuler un état de traitement en cours
    getProfileMock.mockImplementation(() => new Promise(() => {})); // Promise qui ne se résout jamais
    
    render(<SocialCallback />);
    
    // Vérifier que le spinner est affiché
    expect(screen.getByTestId('loading-container')).toBeInTheDocument();
    expect(screen.getByTestId('mocked-spinner')).toBeInTheDocument();
    expect(screen.getByTestId('loading-text')).toHaveTextContent('Finalisation de la connexion...');
    
    // Vérifier que ni l'erreur ni le contenu ne sont affichés
    expect(screen.queryByTestId('error-container')).not.toBeInTheDocument();
  });
  
  it('redirige vers /app après une authentification réussie', async () => {
    // Simuler une authentification réussie
    getProfileMock.mockResolvedValue({ id: '123', name: 'Test User' });
    
    render(<SocialCallback />);
    
    // Vérifier que la redirection est effectuée
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({ to: '/app' });
    });
  });
  
  it('affiche l\'erreur présente dans les paramètres d\'URL', async () => {
    // Simuler une erreur dans les paramètres d'URL
    const errorMessage = "L'authentification a échoué";
    (useSearch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      error: encodeURIComponent(errorMessage)
    });
    
    render(<SocialCallback />);
    
    // Attendre que le message d'erreur soit affiché
    await waitFor(() => {
      expect(screen.getByTestId('error-container')).toBeInTheDocument();
    });
    
    // Vérifier que le message d'erreur est correct
    expect(screen.getByTestId('error-message')).toHaveTextContent(errorMessage);
    
    // Vérifier que le bouton de retour est présent
    expect(screen.getByTestId('login-button')).toBeInTheDocument();
    
    // Vérifier que getProfile n'a pas été appelé
    expect(getProfileMock).not.toHaveBeenCalled();
  });
  
  it('affiche un message d\'erreur si la récupération du profil échoue', async () => {
    // Simuler une erreur lors de la récupération du profil
    getProfileMock.mockRejectedValue(new Error('Profile fetch failed'));
    
    render(<SocialCallback />);
    
    // Attendre que le message d'erreur soit affiché
    await waitFor(() => {
      expect(screen.getByTestId('error-container')).toBeInTheDocument();
    });
    
    // Vérifier que le message d'erreur est correct
    expect(screen.getByTestId('error-message')).toHaveTextContent(
      'Erreur lors de la récupération du profil utilisateur'
    );
  });
  
  it('redirige vers la page de connexion lorsqu\'on clique sur le bouton de retour', async () => {
    // Simuler une erreur
    (useSearch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      error: encodeURIComponent('Erreur test')
    });
    
    render(<SocialCallback />);
    
    // Attendre que le bouton de retour soit affiché
    await waitFor(() => {
      expect(screen.getByTestId('login-button')).toBeInTheDocument();
    });
    
    // Cliquer sur le bouton de retour
    await user.click(screen.getByTestId('login-button'));
    
    // Vérifier que la redirection est effectuée
    expect(navigateMock).toHaveBeenCalledWith({ to: '/login' });
  });
  
  it('retourne null si aucune erreur et le traitement est terminé', async () => {
    // Simuler une situation où il n'y a pas d'erreur mais getProfile ne redirige pas
    // (cas improbable mais possible dans le composant)
    getProfileMock.mockImplementation(async () => {
      // Simuler la fin du traitement sans redirection
      return Promise.resolve(null);
    });
    
    const { container } = render(<SocialCallback />);
    
    // Attendre que le traitement soit terminé
    await waitFor(() => {
      // Vérifier que ni le spinner ni l'erreur ne sont affichés
      expect(screen.queryByTestId('loading-container')).not.toBeInTheDocument();
      expect(screen.queryByTestId('error-container')).not.toBeInTheDocument();
    });
    
    // Vérifier que le composant ne rend rien (null)
    expect(container.firstChild).toBeNull();
  });
});