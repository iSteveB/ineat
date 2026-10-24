import { describe, expect, it } from 'vitest';

import { detectAllergens } from './allergens';

describe('detectAllergens', () => {
	it('repère les allergènes et les regroupe par catégorie', () => {
		expect(detectAllergens('Farine de BLÉ, beurre, crème, œufs frais, noisettes')).toEqual([
			'Gluten',
			'Lait',
			'Œufs',
			'Fruits à coque',
		]);
	});

	it('ignore les faux amis comme la noix de coco ou le beurre de cacao', () => {
		expect(detectAllergens('Noix de coco râpée, lait de coco, beurre de cacao, sucre')).toEqual([]);
	});

	it('garde l’allergène quand il apparaît aussi seul', () => {
		expect(detectAllergens('Beurre de cacao, lait entier en poudre')).toEqual(['Lait']);
	});

	it('ne confond pas un mot plus long avec un mot-clé', () => {
		expect(detectAllergens('Laitue, fromage blanc moulé, gorge')).toEqual(['Lait']);
		expect(detectAllergens('Laitue, tomates, sel')).toEqual([]);
	});

	it('classe le beurre de cacahuète en arachide et la noix de Saint-Jacques en mollusque', () => {
		expect(detectAllergens('Beurre de cacahuète')).toEqual(['Arachides']);
		expect(detectAllergens('Noix de Saint-Jacques')).toEqual(['Mollusques']);
	});

	it('reconnaît les allergènes soulignés d’Open Food Facts', () => {
		expect(detectAllergens('Sucre, _lait_ écrémé, _soja_')).toEqual(['Lait', 'Soja']);
	});
});
