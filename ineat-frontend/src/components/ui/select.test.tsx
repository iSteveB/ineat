import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from './select';

describe('Select', () => {
	it('laisse la liste mobile défiler au-delà de la hauteur du déclencheur', () => {
		render(
			<Select open>
				<SelectTrigger aria-label='Catégorie'>
					<SelectValue placeholder='Sélectionnez une catégorie' />
				</SelectTrigger>
				<SelectContent>
					{Array.from({ length: 20 }, (_, index) => (
						<SelectItem key={index} value={`category-${index}`}>
							Catégorie {index + 1}
						</SelectItem>
					))}
				</SelectContent>
			</Select>,
		);

		const viewport = document.querySelector('[data-slot="select-viewport"]');
		expect(viewport).not.toBeNull();
		expect(viewport).toHaveClass('overflow-y-auto', 'touch-pan-y');
		expect(viewport).not.toHaveClass('h-[var(--radix-select-trigger-height)]');
		expect(screen.getByText('Catégorie 20')).toBeInTheDocument();
	});
});
