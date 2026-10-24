import { describe, expect, it } from 'vitest';

import { getInitials } from './ui-utils';

describe('getInitials', () => {
	it('renvoie les initiales en majuscules', () => {
		expect(getInitials('camille', 'dupont')).toBe('CD');
	});

	it('reste vide sans prénom ni nom', () => {
		expect(getInitials('', '')).toBe('');
		expect(getInitials('Camille', '')).toBe('C');
	});
});
