import { render, screen, fireEvent } from '@testing-library/react';
import { LogoutButton } from './LogoutButton';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from '@tanstack/react-router';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mocks pour useAuthStore et useNavigate
vi.mock('@/stores/authStore', () => ({
	useAuthStore: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
	useNavigate: vi.fn(),
}));

// Mock pour le composant Lucide
vi.mock('lucide-react', () => ({
	LogOut: () => <div data-testid='logout-icon'>Icon</div>,
}));

describe('LogoutButton', () => {
	// Création des mocks pour les fonctions
	const logoutMock = vi.fn();
	const navigateMock = vi.fn();

	beforeEach(() => {
		// Configuration des mocks avant chaque test
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			logout: logoutMock,
		});

		(useNavigate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
			navigateMock
		);

		// Réinitialisation des mocks entre les tests
		vi.clearAllMocks();
	});

	it("rend correctement avec le texte et l'icône", () => {
		render(<LogoutButton />);

		// Vérifier que le bouton est présent
		const button = screen.getByTestId('logout-button');
		expect(button).toBeInTheDocument();

		// Vérifier que l'icône est présente
		const icon = screen.getByTestId('logout-icon');
		expect(icon).toBeInTheDocument();

		// Vérifier que le texte est présent
		expect(button).toHaveTextContent('Se déconnecter');
	});

	it("appelle logout et navigate lorsqu'on clique sur le bouton", () => {
		render(<LogoutButton />);

		const button = screen.getByTestId('logout-button');
		fireEvent.click(button);

		// Vérifier que logout a été appelé
		expect(logoutMock).toHaveBeenCalledTimes(1);

		// Vérifier que navigate a été appelé avec le bon paramètre
		expect(navigateMock).toHaveBeenCalledTimes(1);
		expect(navigateMock).toHaveBeenCalledWith({ to: '/login' });
	});

	it('accepte et applique des props additionnelles', () => {
		// Test avec une prop className supplémentaire
		render(<LogoutButton className='custom-class' disabled />);

		const button = screen.getByTestId('logout-button');

		// Vérifier que la classe est appliquée
		expect(button).toHaveClass('custom-class');

		// Vérifier que le bouton est désactivé
		expect(button).toBeDisabled();
	});

	it('a le variant error par défaut', () => {
		render(<LogoutButton />);

		const button = screen.getByTestId('logout-button');

		// Vérifier que le bouton a les classes correspondant au variant error
		// Les classes exactes sont définies dans buttonVariants dans button.tsx
		expect(button).toHaveClass('bg-error-50');
		expect(button).toHaveClass('text-neutral-50');
	});
});
