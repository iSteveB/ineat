import { z } from 'zod';
import {
	UuidSchema,
	DateInputSchema,
	PriceSchema,
	MediumTextSchema,
} from './base';
import {
	TimestampsSchema,
	ApiSuccessResponseSchema,
	PaginatedResponseSchema,
	DateRangeFilterSchema,
} from './common';

// ===== SCHÉMA BUDGET =====

export const BudgetSchema = z
	.object({
		id: UuidSchema,
		userId: UuidSchema,
		amount: PriceSchema,
		periodStart: z.string().datetime(),
		periodEnd: z.string().datetime(),
		isActive: z.boolean().default(true),
	})
	.merge(TimestampsSchema)
	.refine(
		(data) => {
			const startDate = new Date(data.periodStart);
			const endDate = new Date(data.periodEnd);
			return startDate < endDate;
		},
		{
			message: 'La date de fin doit être postérieure à la date de début',
			path: ['periodEnd'],
		}
	);

export type Budget = z.infer<typeof BudgetSchema>;

// ===== SCHÉMA DÉPENSE =====

export const ExpenseSchema = z
	.object({
		id: UuidSchema,
		userId: UuidSchema,
		budgetId: UuidSchema,
		amount: PriceSchema,
		date: z.string().datetime(),
		source: z
			.string()
			.max(100, 'La source ne peut pas dépasser 100 caractères')
			.optional(),
		receiptId: z.string().optional(), // Référence vers un ticket importé
		category: z
			.string()
			.max(50, 'La catégorie ne peut pas dépasser 50 caractères')
			.optional(),
		notes: MediumTextSchema.optional(),
	})
	.merge(TimestampsSchema);

export type Expense = z.infer<typeof ExpenseSchema>;

// ===== SCHÉMAS DE CRÉATION =====

// Schéma de base pour les budgets (sans validation croisée)
const BaseBudgetSchema = z.object({
	amount: PriceSchema,
	periodStart: DateInputSchema,
	periodEnd: DateInputSchema,
	isActive: z.boolean().default(true),
});

export const CreateBudgetSchema = BaseBudgetSchema.refine(
	(data) => {
		const startDate = new Date(data.periodStart);
		const endDate = new Date(data.periodEnd);
		return startDate < endDate;
	},
	{
		message: 'La date de fin doit être postérieure à la date de début',
		path: ['periodEnd'],
	}
).refine(
	(data) => {
		const startDate = new Date(data.periodStart);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return startDate >= today;
	},
	{
		message: 'La date de début ne peut pas être dans le passé',
		path: ['periodStart'],
	}
);

export type CreateBudgetData = z.infer<typeof CreateBudgetSchema>;

export const CreateExpenseSchema = z.object({
	budgetId: UuidSchema.optional(), // Optionnel, sera déterminé automatiquement si non fourni
	amount: PriceSchema,
	date: DateInputSchema.refine((date) => {
		const expenseDate = new Date(date);
		const today = new Date();
		today.setHours(23, 59, 59, 999);
		return expenseDate <= today;
	}, 'La date de dépense ne peut pas être dans le futur'),
	source: z
		.string()
		.max(100, 'La source ne peut pas dépasser 100 caractères')
		.optional(),
	category: z
		.string()
		.max(50, 'La catégorie ne peut pas dépasser 50 caractères')
		.optional(),
	notes: MediumTextSchema.optional(),
	receiptId: z.string().optional(),
});

export type CreateExpenseData = z.infer<typeof CreateExpenseSchema>;

// ===== SCHÉMAS DE MISE À JOUR =====

export const UpdateBudgetSchema = BaseBudgetSchema.partial();
export type UpdateBudgetData = z.infer<typeof UpdateBudgetSchema>;

export const UpdateExpenseSchema = CreateExpenseSchema.omit({
	budgetId: true,
}).partial();
export type UpdateExpenseData = z.infer<typeof UpdateExpenseSchema>;

// ===== SCHÉMAS DE FILTRAGE =====

export const BudgetFiltersSchema = z.object({
	isActive: z.boolean().optional(),
	dateRange: DateRangeFilterSchema.optional(),
	amountRange: z
		.object({
			min: PriceSchema.optional(),
			max: PriceSchema.optional(),
		})
		.optional(),
});
export type BudgetFilters = z.infer<typeof BudgetFiltersSchema>;

export const ExpenseFiltersSchema = z.object({
	budgetId: UuidSchema.optional(),
	dateRange: DateRangeFilterSchema.optional(),
	amountRange: z
		.object({
			min: PriceSchema.optional(),
			max: PriceSchema.optional(),
		})
		.optional(),
	source: z.string().optional(),
	category: z.string().optional(),
	hasReceipt: z.boolean().optional(),
});
export type ExpenseFilters = z.infer<typeof ExpenseFiltersSchema>;

// ===== SCHÉMAS DE STATISTIQUES =====

export const BudgetStatsSchema = z.object({
	// Informations générales
	totalBudget: z.number().min(0),
	totalSpent: z.number().min(0),
	remaining: z.number(),
	percentageUsed: z.number().min(0).max(100),

	// Prédictions
	projectedSpending: z.number().min(0),
	daysRemaining: z.number().int().min(0),
	averageDailySpending: z.number().min(0),
	suggestedDailyBudget: z.number().min(0),

	// Alertes
	isOverBudget: z.boolean(),
	isNearBudget: z.boolean(), // > 75%
	riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),

	// Répartition par catégorie
	categoryBreakdown: z.array(
		z.object({
			category: z.string(),
			amount: z.number().min(0),
			percentage: z.number().min(0).max(100),
			transactionCount: z.number().int().min(0),
		})
	),

	// Répartition par source
	sourceBreakdown: z.array(
		z.object({
			source: z.string(),
			amount: z.number().min(0),
			percentage: z.number().min(0).max(100),
			transactionCount: z.number().int().min(0),
		})
	),

	// Évolution dans le temps
	dailySpending: z.array(
		z.object({
			date: z.string(),
			amount: z.number().min(0),
			cumulativeAmount: z.number().min(0),
		})
	),
});

export type BudgetStats = z.infer<typeof BudgetStatsSchema>;

// Comparaison avec les périodes précédentes
export const BudgetComparisonSchema = z.object({
	currentPeriod: BudgetStatsSchema,
	previousPeriod: BudgetStatsSchema.optional(),
	changes: z
		.object({
			totalSpentChange: z.number(),
			percentageChange: z.number(),
			averageDailyChange: z.number(),
			categoryChanges: z.array(
				z.object({
					category: z.string(),
					change: z.number(),
					percentageChange: z.number(),
				})
			),
		})
		.optional(),
});

export type BudgetComparison = z.infer<typeof BudgetComparisonSchema>;

// ===== SCHÉMAS D'ALERTES =====

export const BudgetAlertSchema = z
	.object({
		id: UuidSchema,
		budgetId: UuidSchema,
		type: z.enum([
			'THRESHOLD_75',
			'THRESHOLD_90',
			'OVER_BUDGET',
			'DAILY_LIMIT',
		]),
		title: z.string(),
		message: z.string(),
		severity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
		isRead: z.boolean().default(false),
		actionRequired: z.boolean().default(false),
		suggestions: z.array(z.string()).optional(),
	})
	.merge(TimestampsSchema);

export type BudgetAlert = z.infer<typeof BudgetAlertSchema>;

// ===== SCHÉMAS DE RÉPONSES API =====

export const BudgetResponseSchema = ApiSuccessResponseSchema(BudgetSchema);
export type BudgetResponse = z.infer<typeof BudgetResponseSchema>;

export const BudgetListResponseSchema = ApiSuccessResponseSchema(
	PaginatedResponseSchema(BudgetSchema)
);
export type BudgetListResponse = z.infer<typeof BudgetListResponseSchema>;

export const ExpenseResponseSchema = ApiSuccessResponseSchema(ExpenseSchema);
export type ExpenseResponse = z.infer<typeof ExpenseResponseSchema>;

export const ExpenseListResponseSchema = ApiSuccessResponseSchema(
	PaginatedResponseSchema(ExpenseSchema)
);
export type ExpenseListResponse = z.infer<typeof ExpenseListResponseSchema>;

export const BudgetStatsResponseSchema =
	ApiSuccessResponseSchema(BudgetStatsSchema);
export type BudgetStatsResponse = z.infer<typeof BudgetStatsResponseSchema>;

export const BudgetComparisonResponseSchema = ApiSuccessResponseSchema(
	BudgetComparisonSchema
);
export type BudgetComparisonResponse = z.infer<
	typeof BudgetComparisonResponseSchema
>;

export const BudgetAlertsResponseSchema = ApiSuccessResponseSchema(
	z.array(BudgetAlertSchema)
);
export type BudgetAlertsResponse = z.infer<typeof BudgetAlertsResponseSchema>;

// ===== NOUVELLES RÉPONSES API POUR L'INTÉGRATION FRONTEND =====

// Réponse de vérification d'existence de budget
export const BudgetExistsResponseSchema = ApiSuccessResponseSchema(
	z.object({
		exists: z.boolean(),
		currentBudget: BudgetSchema.optional(),
	})
);
export type BudgetExistsResponse = z.infer<typeof BudgetExistsResponseSchema>;

// Réponse du budget actuel avec stats et alertes
export const CurrentBudgetResponseSchema = ApiSuccessResponseSchema(
	z.object({
		budget: BudgetSchema,
		stats: BudgetStatsSchema,
		alerts: z.array(BudgetAlertSchema),
	})
);
export type CurrentBudgetResponse = z.infer<typeof CurrentBudgetResponseSchema>;

// Réponse enrichie d'ajout de produit avec impact budget
export const ProductWithBudgetImpactSchema = z.object({
	item: z.object({
		id: UuidSchema,
		name: z.string(),
		quantity: z.number(),
		purchasePrice: z.number().optional(),
		purchaseDate: z.string(),
		// Autres propriétés du produit selon le besoin
	}),
	budget: z.object({
		expenseCreated: z.boolean(),
		message: z.string(),
		budgetId: UuidSchema.optional(),
		remainingBudget: z.number().optional(),
	}),
});
export type ProductWithBudgetImpact = z.infer<typeof ProductWithBudgetImpactSchema>;

// Réponse API pour l'ajout de produit avec impact budget
export const ProductWithBudgetImpactResponseSchema = ApiSuccessResponseSchema(
	ProductWithBudgetImpactSchema
);
export type ProductWithBudgetImpactResponse = z.infer<typeof ProductWithBudgetImpactResponseSchema>;

// ===== INTERFACES POUR LES STORES ZUSTAND =====

// État principal du budget pour le store global
export interface BudgetState {
	currentBudget: Budget | null;
	budgetStats: BudgetStats | null;
	alerts: BudgetAlert[];
	isLoading: boolean;
	error: string | null;
}

// État pour la page budget détaillée
export interface BudgetPageState {
	selectedBudget: Budget | null;
	expenses: Expense[];
	budgetHistory: Budget[];
	selectedMonth: string; // Format: "2024-12"
	isLoadingExpenses: boolean;
	isLoadingHistory: boolean;
	expensesError: string | null;
}

// État pour les actions du store budget
export interface BudgetActions {
	// Actions budget
	fetchCurrentBudget: () => Promise<void>;
	checkBudgetExists: () => Promise<boolean>;
	createMonthlyBudget: (amount: number) => Promise<Budget>;
	updateBudget: (budgetId: string, data: UpdateBudgetData) => Promise<Budget>;
	
	// Actions page budget
	fetchBudgetByMonth: (month: string) => Promise<void>;
	fetchBudgetHistory: () => Promise<void>;
	fetchExpensesByBudget: (budgetId: string) => Promise<void>;
	setSelectedMonth: (month: string) => void;
	
	// Actions utilitaires
	clearError: () => void;
	markAlertAsRead: (alertId: string) => void;
}

// État complet du store budget
export interface BudgetStore extends BudgetState, BudgetPageState, BudgetActions {}

// ===== UTILITAIRES =====

/**
 * Calcule les statistiques d'un budget
 */
export const calculateBudgetStats = (
	budget: Budget,
	expenses: Expense[]
): BudgetStats => {
	const totalBudget = budget.amount;
	const totalSpent = expenses.reduce(
		(sum, expense) => sum + expense.amount,
		0
	);
	const remaining = totalBudget - totalSpent;
	const percentageUsed =
		totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

	// Calcul des jours
	const startDate = new Date(budget.periodStart);
	const endDate = new Date(budget.periodEnd);
	const today = new Date();

	const totalDays = Math.ceil(
		(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
	);
	const daysElapsed = Math.ceil(
		(today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
	);
	const daysRemaining = Math.max(0, totalDays - daysElapsed);

	const averageDailySpending = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
	const suggestedDailyBudget =
		daysRemaining > 0 ? remaining / daysRemaining : 0;

	// Projection
	const projectedSpending =
		daysRemaining > 0
			? totalSpent + averageDailySpending * daysRemaining
			: totalSpent;

	// Niveaux d'alerte
	const isOverBudget = totalSpent > totalBudget;
	const isNearBudget = percentageUsed > 75;

	let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
	if (isOverBudget || projectedSpending > totalBudget * 1.1) {
		riskLevel = 'HIGH';
	} else if (isNearBudget || projectedSpending > totalBudget) {
		riskLevel = 'MEDIUM';
	}

	return {
		totalBudget,
		totalSpent,
		remaining,
		percentageUsed: Math.min(percentageUsed, 100),
		projectedSpending,
		daysRemaining,
		averageDailySpending,
		suggestedDailyBudget: Math.max(0, suggestedDailyBudget),
		isOverBudget,
		isNearBudget,
		riskLevel,
		categoryBreakdown: [], // À implémenter
		sourceBreakdown: [], // À implémenter
		dailySpending: [], // À implémenter
	};
};

/**
 * Détermine si une alerte doit être envoyée
 */
export const shouldTriggerAlert = (
	stats: BudgetStats,
	lastAlertPercentage: number = 0
): { shouldAlert: boolean; alertType: BudgetAlert['type'] | null } => {
	const { percentageUsed, isOverBudget } = stats;

	if (isOverBudget && lastAlertPercentage < 100) {
		return { shouldAlert: true, alertType: 'OVER_BUDGET' };
	}

	if (percentageUsed >= 90 && lastAlertPercentage < 90) {
		return { shouldAlert: true, alertType: 'THRESHOLD_90' };
	}

	if (percentageUsed >= 75 && lastAlertPercentage < 75) {
		return { shouldAlert: true, alertType: 'THRESHOLD_75' };
	}

	return { shouldAlert: false, alertType: null };
};

/**
 * Génère des suggestions pour optimiser le budget
 */
export const generateBudgetSuggestions = (stats: BudgetStats): string[] => {
	const suggestions: string[] = [];

	if (stats.isOverBudget) {
		suggestions.push(
			'Votre budget est dépassé. Essayez de réduire vos dépenses non essentielles.'
		);
	} else if (stats.riskLevel === 'HIGH') {
		suggestions.push(
			'Attention : vous risquez de dépasser votre budget. Surveillez vos prochains achats.'
		);
	} else if (stats.riskLevel === 'MEDIUM') {
		suggestions.push(
			'Vous êtes sur la bonne voie, mais restez vigilant sur vos dépenses.'
		);
	}

	if (
		stats.daysRemaining > 0 &&
		stats.suggestedDailyBudget < stats.averageDailySpending
	) {
		suggestions.push(
			`Essayez de limiter vos dépenses à ${stats.suggestedDailyBudget.toFixed(
				2
			)}€ par jour.`
		);
	}

	return suggestions;
};

/**
 * Valide qu'une dépense peut être ajoutée à un budget
 */
export const validateExpenseForBudget = (
	expense: CreateExpenseData,
	budget: Budget
): { isValid: boolean; error?: string } => {
	const expenseDate = new Date(expense.date);
	const budgetStart = new Date(budget.periodStart);
	const budgetEnd = new Date(budget.periodEnd);

	if (expenseDate < budgetStart || expenseDate > budgetEnd) {
		return {
			isValid: false,
			error: 'La date de la dépense doit être comprise dans la période du budget',
		};
	}

	return { isValid: true };
};

/**
 * Formate un montant en euros
 */
export const formatCurrency = (amount: number): string => {
	return new Intl.NumberFormat('fr-FR', {
		style: 'currency',
		currency: 'EUR',
	}).format(amount);
};

/**
 * Formate une période de budget
 */
export const formatBudgetPeriod = (budget: Budget): string => {
	const start = new Date(budget.periodStart);
	
	return new Intl.DateTimeFormat('fr-FR', {
		year: 'numeric',
		month: 'long',
	}).format(start);
};

/**
 * Obtient l'année et le mois au format string (ex: "2024-12")
 */
export const getMonthString = (date: Date = new Date()): string => {
	const year = date.getFullYear();
	const month = (date.getMonth() + 1).toString().padStart(2, '0');
	return `${year}-${month}`;
};

/**
 * Parse un string de mois vers une date (premier jour du mois)
 */
export const parseMonthString = (monthString: string): Date => {
	const [year, month] = monthString.split('-');
	return new Date(parseInt(year), parseInt(month) - 1, 1);
};