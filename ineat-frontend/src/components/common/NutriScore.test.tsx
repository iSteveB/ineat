import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import NutriScore from './NutriScore';

describe('NutriScore', () => {
	it('annonce la note en texte et masque la frise décorative', () => {
		render(<NutriScore score='B' />);

		const scale = screen.getByRole('img', { name: 'Nutri-Score B' });
		expect(scale).toBeInTheDocument();
		expect(scale.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
	});

	it('met en avant uniquement la lettre du produit', () => {
		render(<NutriScore score='D' size='sm' />);

		const active = screen.getByText('D');
		expect(active).toHaveClass('bg-nutri-d', 'border-surface');
		expect(screen.getByText('A')).not.toHaveClass('border-surface');
	});
});
