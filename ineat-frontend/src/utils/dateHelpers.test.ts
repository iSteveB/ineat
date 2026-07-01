import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatRelativeDate } from './dateHelpers';

describe('formatRelativeDate', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-01T10:00:00.000Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('keeps short J labels for dates within 30 days', () => {
		expect(formatRelativeDate('2026-07-01')).toBe('J-0');
		expect(formatRelativeDate('2026-07-02')).toBe('J-1');
		expect(formatRelativeDate('2026-07-31')).toBe('J-30');
	});

	it('uses month labels after 30 days', () => {
		expect(formatRelativeDate('2026-08-01')).toBe('Dans 1 mois');
		expect(formatRelativeDate('2026-09-15')).toBe('Dans 2 mois');
	});

	it('uses year labels for distant expiry dates', () => {
		expect(formatRelativeDate('2028-06-23')).toBe('Dans 2 ans');
	});

	it('keeps expired and missing date labels', () => {
		expect(formatRelativeDate('2026-06-30')).toBe('Expiré');
		expect(formatRelativeDate(null)).toBe('Pas de date');
	});
});
