import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ExpiryBadge from './ExpiryBadge';

describe('ExpiryBadge', () => {
	it('affiche le libellé avec une icône décorative', () => {
		const { container } = render(<ExpiryBadge status='CRITICAL'>Demain</ExpiryBadge>);

		expect(screen.getByText('Demain')).toBeInTheDocument();
		expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
	});

	it('applique le ton de chaque statut', () => {
		const { rerender } = render(<ExpiryBadge status='GOOD'>Frais</ExpiryBadge>);
		expect(screen.getByText('Frais')).toHaveClass('bg-success-50', 'text-success-700');

		rerender(<ExpiryBadge status='WARNING'>Dans 3 jours</ExpiryBadge>);
		expect(screen.getByText('Dans 3 jours')).toHaveClass('bg-warning-50', 'text-warning-700');

		rerender(<ExpiryBadge status='EXPIRED'>Périmé</ExpiryBadge>);
		expect(screen.getByText('Périmé')).toHaveClass('bg-danger-600', 'text-surface');
	});
});
