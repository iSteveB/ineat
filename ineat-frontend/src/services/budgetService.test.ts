import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import { budgetService } from './budgetService';
import { server } from '@/test/mocks/server';

const API_URL = import.meta.env.VITE_API_URL;

const budget = {
	id: '11111111-1111-4111-8111-111111111111',
	userId: '22222222-2222-4222-8222-222222222222',
	amount: 450,
	periodStart: '2026-04-01T00:00:00.000Z',
	periodEnd: '2026-04-30T23:59:59.999Z',
	isActive: false,
	createdAt: '2026-04-01T00:00:00.000Z',
	updatedAt: '2026-04-30T23:59:59.999Z',
};

const stats = {
	totalBudget: 450,
	totalSpent: 120,
	remaining: 330,
	percentageUsed: 26.67,
	projectedSpending: 120,
	daysRemaining: 0,
	averageDailySpending: 4,
	suggestedDailyBudget: 0,
	isOverBudget: false,
	isNearBudget: false,
	riskLevel: 'LOW' as const,
	categoryBreakdown: [],
	sourceBreakdown: [],
	dailySpending: [],
};

describe('budgetService', () => {
	it('récupère toutes les données du budget pour un mois historique', async () => {
		server.use(
			http.get(`${API_URL}/budget/month/2026-04`, () =>
				HttpResponse.json({
					success: true,
					data: { budget, stats, expenses: [], alerts: [] },
				})
			),
		);

		const result = await budgetService.getBudgetByMonth('2026-04');

		expect(result).toMatchObject({
			budget: { id: budget.id, isActive: false },
			stats: { totalSpent: 120, daysRemaining: 0 },
			expenses: [],
			alerts: [],
		});
	});

	it('retourne null lorsqu’aucun budget n’existe pour le mois', async () => {
		server.use(
			http.get(`${API_URL}/budget/month/2026-03`, () =>
				HttpResponse.json({ success: true, data: null })
			),
		);

		await expect(
			budgetService.getBudgetByMonth('2026-03')
		).resolves.toBeNull();
	});
});
