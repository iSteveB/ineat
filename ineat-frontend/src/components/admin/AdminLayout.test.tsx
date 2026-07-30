import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminLayout from './AdminLayout';
import { useAuthStore } from '@/stores/authStore';

vi.mock('@tanstack/react-router', () => ({
	Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
		<a href={to} {...props}>
			{children}
		</a>
	),
	Outlet: () => <main data-testid='admin-outlet'>Contenu admin</main>,
	useLocation: () => ({ pathname: '/app/admin/users' }),
}));

vi.mock('@/stores/authStore', () => ({
	useAuthStore: vi.fn(),
}));

describe('AdminLayout', () => {
	beforeEach(() => vi.clearAllMocks());

	it('affiche un état 403 cohérent sans capability admin', () => {
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			firstName: 'Alex',
			lastName: 'User',
			capabilities: { canAccessAdmin: false },
		});

		render(<AdminLayout />);

		expect(screen.getByText('Accès administrateur requis')).toBeInTheDocument();
		expect(screen.queryByTestId('admin-outlet')).not.toBeInTheDocument();
	});

	it('affiche la navigation et le fil d’Ariane pour un admin', () => {
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			firstName: 'Ada',
			lastName: 'Admin',
			capabilities: { canAccessAdmin: true },
		});

		render(<AdminLayout />);

		expect(
			screen.getByRole('navigation', { name: 'Navigation administration' })
		).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Utilisateurs/ })).toHaveAttribute(
			'aria-current',
			'page'
		);
		expect(screen.getByRole('navigation', { name: 'Fil d’Ariane' })).toHaveTextContent(
			'Administration/Utilisateurs'
		);
		expect(screen.getByTestId('admin-outlet')).toBeInTheDocument();
	});
});
