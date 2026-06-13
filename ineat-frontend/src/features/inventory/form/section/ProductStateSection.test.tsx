import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProductStateSection } from './ProductStateSection';

describe('ProductStateSection', () => {
	it("n'affiche rien quand aucun état avancé n'est utile", () => {
		const { container } = render(
			<ProductStateSection
				values={{}}
				productName='Riz basmati'
				categorySlug='epicerie-salee'
				storageLocation='placard'
				onChange={vi.fn()}
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});

	it('affiche ouvert/fermé pour un produit laitier', () => {
		render(
			<ProductStateSection
				values={{ packageStatus: 'UNOPENED' }}
				productName='Lait demi-écrémé'
				categorySlug='produits-laitiers'
				storageLocation='refrigerateur'
				onChange={vi.fn()}
			/>,
		);

		expect(screen.getByText('Préciser l’état du produit')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Fermé' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Ouvert' })).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: 'Cru' }),
		).not.toBeInTheDocument();
	});

	it('appelle onChange quand un état est sélectionné', () => {
		const onChange = vi.fn();

		render(
			<ProductStateSection
				values={{ preparationStatus: 'RAW' }}
				productName='Filet de poisson'
				categorySlug='viandes-et-poissons'
				storageLocation='refrigerateur'
				onChange={onChange}
			/>,
		);

		fireEvent.click(screen.getByRole('button', { name: 'Cuit' }));

		expect(onChange).toHaveBeenCalledWith('preparationStatus', 'COOKED');
	});
});
