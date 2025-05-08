import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UserMenu } from './UserMenu';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from '@tanstack/react-router';

// Mocks pour les dépendances
vi.mock('@/stores/authStore', () => ({
	useAuthStore: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
	useNavigate: vi.fn(),
}));

// Mocks pour les icônes
vi.mock('lucide-react', () => ({
	LogOut: () => <div data-testid='logout-icon' />,
	Settings: () => <div data-testid='settings-icon' />,
	User: () => <div data-testid='user-icon' />,
}));

// Mock pour le DropdownMenu de Radix UI
vi.mock('../ui/dropdown-menu', async () => {
	const actual = await vi.importActual('../ui/dropdown-menu');
	return {
		...actual,
		DropdownMenu: ({ children }: { children: React.ReactNode }) => (
			<div data-testid='dropdown-menu'>{children}</div>
		),
		DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
			<div data-testid='dropdown-trigger'>{children}</div>
		),
		DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
			<div data-testid='dropdown-content'>{children}</div>
		),
		DropdownMenuItem: ({
			children,
			onClick,
		}: {
			children: React.ReactNode;
			onClick?: () => void;
		}) => (
			<div data-testid='dropdown-item' onClick={onClick}>
				{children}
			</div>
		),
		DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
			<div data-testid='dropdown-label'>{children}</div>
		),
		DropdownMenuSeparator: () => <div data-testid='dropdown-separator' />,
	};
});

describe('UserMenu', () => {
	// Préparation des mocks
	const navigateMock = vi.fn();
	const logoutMock = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		// Configuration des mocks par défaut
		(useNavigate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
			navigateMock
		);
	});

	it("ne rend rien si l'utilisateur n'est pas défini", () => {
		// Simuler l'absence d'utilisateur
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			user: null,
			logout: logoutMock,
		});

		const { container } = render(<UserMenu />);

		// Vérifier que le composant ne rend rien
		expect(container.firstChild).toBeNull();
	});

	it("affiche correctement les informations de l'utilisateur", () => {
		// Simuler un utilisateur connecté
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			user: {
				firstName: 'John',
				lastName: 'Doe',
				email: 'john.doe@example.com',
				profileType: 'FAMILY',
			},
			logout: logoutMock,
		});

		render(<UserMenu />);

		// Avec notre mock, le contenu du dropdown est maintenant toujours visible
		// Vérifier que les informations de l'utilisateur sont présentes
		expect(screen.getByTestId('avatar-initials')).toHaveTextContent('JD');
		expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe');
		expect(screen.getByTestId('user-email')).toHaveTextContent(
			'john.doe@example.com'
		);
		expect(screen.getByTestId('user-profile-type')).toHaveTextContent(
			'Famille'
		);
	});

	it('convertit correctement les types de profil en libellés français', () => {
		// Tester chaque type de profil
		const profileTypes = [
			{ type: 'FAMILY', label: 'Famille' },
			{ type: 'STUDENT', label: 'Étudiant' },
			{ type: 'SINGLE', label: 'Solo' },
			{ type: 'UNKNOWN', label: 'Inconnu' }, // Cas par défaut
		];

		for (const { type, label } of profileTypes) {
			// Simuler un utilisateur avec ce type de profil
			(
				useAuthStore as unknown as ReturnType<typeof vi.fn>
			).mockReturnValue({
				user: {
					firstName: 'John',
					lastName: 'Doe',
					email: 'john.doe@example.com',
					profileType: type,
				},
				logout: logoutMock,
			});

			const { unmount } = render(<UserMenu />);

			// Vérifier que le libellé du type de profil est correct
			expect(screen.getByTestId('user-profile-type')).toHaveTextContent(
				label
			);

			// Démonter le composant avant de tester le type suivant
			unmount();
		}
	});

	it("gère correctement l'absence de nom et prénom", () => {
		// Simuler un utilisateur sans nom ni prénom
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			user: {
				email: 'john.doe@example.com',
				profileType: 'FAMILY',
			},
			logout: logoutMock,
		});

		render(<UserMenu />);

		// Vérifier que les initiales par défaut sont affichées
		expect(screen.getByTestId('avatar-initials')).toHaveTextContent('??');
	});

	it("navigue vers la page de profil quand on clique sur l'élément correspondant", () => {
		// Simuler un utilisateur connecté
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			user: {
				firstName: 'John',
				lastName: 'Doe',
				email: 'john.doe@example.com',
				profileType: 'FAMILY',
			},
			logout: logoutMock,
		});

		render(<UserMenu />);

		// Trouver tous les éléments du menu déroulant
		const menuItems = screen.getAllByTestId('dropdown-item');

		// Trouver l'élément de profil (le premier élément de menu après le séparateur)
		const profileMenuItem = menuItems.find((item) =>
			item.textContent?.includes('Profil')
		);
		expect(profileMenuItem).toBeDefined();

		// Cliquer sur l'élément de menu "Profil"
		if (profileMenuItem) {
			fireEvent.click(profileMenuItem);
		}

		// Vérifier que la navigation est appelée avec la bonne destination
		expect(navigateMock).toHaveBeenCalledWith({ to: '/app/profile' });
	});

	it("navigue vers la page des paramètres quand on clique sur l'élément correspondant", () => {
		// Simuler un utilisateur connecté
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			user: {
				firstName: 'John',
				lastName: 'Doe',
				email: 'john.doe@example.com',
				profileType: 'FAMILY',
			},
			logout: logoutMock,
		});

		render(<UserMenu />);

		// Trouver tous les éléments du menu déroulant
		const menuItems = screen.getAllByTestId('dropdown-item');

		// Trouver l'élément de paramètres (le deuxième élément de menu après le séparateur)
		const settingsMenuItem = menuItems.find((item) =>
			item.textContent?.includes('Paramètres')
		);
		expect(settingsMenuItem).toBeDefined();

		// Cliquer sur l'élément de menu "Paramètres"
		if (settingsMenuItem) {
			fireEvent.click(settingsMenuItem);
		}

		// Vérifier que la navigation est appelée avec la bonne destination
		expect(navigateMock).toHaveBeenCalledWith({
			to: '/app/profile/settings',
		});
	});

	it("se déconnecte et redirige vers la page de connexion quand on clique sur l'élément correspondant", () => {
		// Simuler un utilisateur connecté
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			user: {
				firstName: 'John',
				lastName: 'Doe',
				email: 'john.doe@example.com',
				profileType: 'FAMILY',
			},
			logout: logoutMock,
		});

		render(<UserMenu />);

		// Trouver tous les éléments du menu déroulant
		const menuItems = screen.getAllByTestId('dropdown-item');

		// Trouver l'élément de déconnexion (le dernier élément de menu)
		const logoutMenuItem = menuItems.find((item) =>
			item.textContent?.includes('Se déconnecter')
		);
		expect(logoutMenuItem).toBeDefined();

		// Cliquer sur l'élément de menu "Se déconnecter"
		if (logoutMenuItem) {
			fireEvent.click(logoutMenuItem);
		}

		// Vérifier que la fonction de déconnexion est appelée
		expect(logoutMock).toHaveBeenCalledTimes(1);

		// Vérifier que la navigation est appelée avec la bonne destination
		expect(navigateMock).toHaveBeenCalledWith({ to: '/login' });
	});
});
