import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { calculateExpiryStatus, formatExpiryLabel, formatRelativeDate } from './dateHelpers';

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

describe('formatExpiryLabel', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-01T10:00:00.000Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('uses relative words for the next days', () => {
		expect(formatExpiryLabel('2026-06-30')).toBe('Périmé');
		expect(formatExpiryLabel('2026-07-01')).toBe("Aujourd'hui");
		expect(formatExpiryLabel('2026-07-02')).toBe('Demain');
		expect(formatExpiryLabel('2026-07-04')).toBe('Dans 3 jours');
	});

	it('switches to months and years for distant dates', () => {
		expect(formatExpiryLabel('2026-09-15')).toBe('Dans 2 mois');
		expect(formatExpiryLabel('2027-08-01')).toBe('Dans 1 an');
	});

	it('handles missing or invalid dates', () => {
		expect(formatExpiryLabel(null)).toBe('Pas de date');
		expect(formatExpiryLabel('pas une date')).toBe('Pas de date');
	});
});

describe('calculateExpiryStatus', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		// En fin de journée : un calcul en millisecondes classerait le jour même comme périmé
		vi.setSystemTime(new Date(2026, 6, 1, 21, 30));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('compte en jours calendaires, indépendamment de l’heure', () => {
		expect(calculateExpiryStatus(new Date(2026, 5, 30).toISOString())).toBe('EXPIRED');
		expect(calculateExpiryStatus(new Date(2026, 6, 1).toISOString())).toBe('CRITICAL');
		expect(calculateExpiryStatus(new Date(2026, 6, 3).toISOString())).toBe('CRITICAL');
		expect(calculateExpiryStatus(new Date(2026, 6, 4).toISOString())).toBe('WARNING');
		expect(calculateExpiryStatus(new Date(2026, 6, 6).toISOString())).toBe('WARNING');
		expect(calculateExpiryStatus(new Date(2026, 6, 7).toISOString())).toBe('GOOD');
		expect(calculateExpiryStatus(null)).toBe('UNKNOWN');
	});
});
