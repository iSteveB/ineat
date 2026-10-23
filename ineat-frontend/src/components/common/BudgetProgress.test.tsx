import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import BudgetProgress from './BudgetProgress';

describe('BudgetProgress', () => {
	it('affiche le reste à dépenser sous le seuil d’alerte', () => {
		render(<BudgetProgress spent={212} total={350} daysRemaining={10} />);

		expect(screen.getByRole('progressbar', { name: '61 % du budget utilisé' })).toHaveAttribute(
			'aria-valuenow',
			'61'
		);
		expect(screen.getByText(/Il reste 138\s€ pour 10 jours\./)).toBeInTheDocument();
	});

	it('passe en avertissement à partir de 80 %', () => {
		render(<BudgetProgress spent={301} total={350} />);

		expect(screen.getByText(/86 % utilisé, il reste 49\s€\./)).toHaveClass('text-warning-700');
	});

	it('signale un dépassement en texte et plafonne la barre à 100 %', () => {
		render(<BudgetProgress spent={372} total={350} />);

		const bar = screen.getByRole('progressbar');
		expect(bar).toHaveAttribute('aria-valuenow', '100');
		expect(bar).toHaveAccessibleName(/Budget dépassé de 22\s€\./);
		expect(screen.getByText(/Budget dépassé de 22\s€\./)).toHaveClass('text-danger-700');
	});
});
