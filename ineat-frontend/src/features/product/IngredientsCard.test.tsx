import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { IngredientsCard } from './IngredientsCard';

describe('IngredientsCard', () => {
	it('affiche les allergènes Open Food Facts en gras sans underscores', () => {
		render(
			<IngredientsCard ingredients='Cornichons (contient _sulfites_), graines de _moutarde_.' />,
		);

		expect(screen.getByText('sulfites')).toHaveRole('strong');
		expect(screen.getByText('moutarde')).toHaveRole('strong');
		expect(screen.queryByText(/_sulfites_|_moutarde_/)).not.toBeInTheDocument();
		expect(screen.getByText('sulfites').closest('p')).toHaveTextContent(
			'Cornichons (contient sulfites), graines de moutarde.',
		);
	});
});
