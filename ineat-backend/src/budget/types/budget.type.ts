import { Prisma } from '@prisma/client';

// ===== TYPES BASÉS SUR PRISMA =====

// Type Budget depuis Prisma
export type Budget = {
  id: string;
  userId: string;
  amount: number;
  periodStart: Date;
  periodEnd: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Type Expense depuis Prisma
export type Expense = {
  id: string;
  userId: string;
  budgetId: string;
  amount: number;
  date: Date;
  source: string | null;
  notes: string | null;
  receiptId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ===== TYPES DE STATISTIQUES =====

export type BudgetStats = {
  // Informations générales
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  percentageUsed: number;

  // Prédictions
  projectedSpending: number;
  daysRemaining: number;
  averageDailySpending: number;
  suggestedDailyBudget: number;

  // Alertes
  isOverBudget: boolean;
  isNearBudget: boolean; // > 75%
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';

  // Répartition par catégorie
  categoryBreakdown: CategoryBreakdown[];

  // Répartition par source
  sourceBreakdown: SourceBreakdown[];

  // Évolution dans le temps
  dailySpending: DailySpending[];
};

export type CategoryBreakdown = {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
};

export type SourceBreakdown = {
  source: string;
  amount: number;
  percentage: number;
  transactionCount: number;
};

export type DailySpending = {
  date: string;
  amount: number;
  cumulativeAmount: number;
};

export type BudgetComparison = {
  currentPeriod: BudgetStats;
  previousPeriod?: BudgetStats;
  changes?: {
    totalSpentChange: number;
    percentageChange: number;
    averageDailyChange: number;
    categoryChanges: CategoryChange[];
  };
};

export type CategoryChange = {
  category: string;
  change: number;
  percentageChange: number;
};

// ===== TYPES D'ALERTES =====

export type BudgetAlert = {
  id: string;
  budgetId: string;
  type: 'THRESHOLD_75' | 'THRESHOLD_90' | 'OVER_BUDGET' | 'DAILY_LIMIT';
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  isRead: boolean;
  actionRequired: boolean;
  suggestions?: string[];
  createdAt: Date;
  updatedAt: Date;
};

// ===== TYPES DE VALIDATION =====

export type ValidationResult = {
  isValid: boolean;
  error?: string;
};

export type AlertCheck = {
  shouldAlert: boolean;
  alertType: BudgetAlert['type'] | null;
};

// ===== TYPES POUR LES FILTRES =====

export type BudgetFilters = {
  isActive?: boolean;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
  amountRange?: {
    min?: number;
    max?: number;
  };
};

export type ExpenseFilters = {
  budgetId?: string;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
  amountRange?: {
    min?: number;
    max?: number;
  };
  source?: string;
  hasReceipt?: boolean;
};

// ===== TYPES DE RÉPONSE =====

export type BudgetSetupStatus = {
  needsSetup: boolean;
  hasCurrentBudget: boolean;
  hasPreviousBudget: boolean;
  suggestedAmount?: number;
};

// ===== TYPES POUR LES REQUÊTES =====

export type CreateBudgetData = {
  amount: number;
  periodStart: string;
  periodEnd: string;
  isActive?: boolean;
};

export type UpdateBudgetData = {
  amount?: number;
  periodStart?: string;
  periodEnd?: string;
  isActive?: boolean;
};

export type CreateExpenseData = {
  budgetId?: string;
  amount: number;
  date: string;
  source?: string;
  notes?: string;
  receiptId?: string;
};

export type UpdateExpenseData = {
  amount?: number;
  date?: string;
  source?: string;
  notes?: string;
};

export type AddProductExpenseData = {
  amount: number;
  source?: string;
  receiptId?: string;
};

// ===== TYPES AVEC RELATIONS =====

export type BudgetWithExpenses = Budget & {
  expenses: Expense[];
};

export type ExpenseWithBudget = Expense & {
  budget: Budget;
};

// ===== TYPES DE PAGINATION =====

export type PaginatedBudgets = {
  budgets: Budget[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type PaginatedExpenses = {
  expenses: Expense[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

// ===== TYPES POUR LES RÉPONSES API =====

export type BudgetResponse = {
  success: true;
  data: Budget;
  message?: string;
};

export type BudgetListResponse = {
  success: true;
  data: PaginatedBudgets;
  message?: string;
};

export type ExpenseResponse = {
  success: true;
  data: Expense;
  message?: string;
};

export type ExpenseListResponse = {
  success: true;
  data: PaginatedExpenses;
  message?: string;
};

export type BudgetStatsResponse = {
  success: true;
  data: BudgetStats;
  message?: string;
};

export type BudgetComparisonResponse = {
  success: true;
  data: BudgetComparison;
  message?: string;
};

export type BudgetAlertsResponse = {
  success: true;
  data: BudgetAlert[];
  message?: string;
};

export type BudgetSetupStatusResponse = {
  success: true;
  data: BudgetSetupStatus;
  message?: string;
};

// ===== TYPES D'ERREUR =====

export type BudgetError = {
  success: false;
  message: string;
  error?: string;
  details?: Record<string, unknown>;
};

export type ApiResponse<T> =
  | {
      success: true;
      data: T;
      message?: string;
    }
  | BudgetError;
