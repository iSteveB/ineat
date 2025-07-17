// ===== INTERFACES BUDGET =====

export interface Budget {
  id: string;
  userId: string;
  amount: number;
  periodStart: Date;
  periodEnd: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;
  userId: string;
  budgetId: string;
  amount: number;
  date: Date;
  source?: string;
  category?: string;
  notes?: string;
  receiptId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===== INTERFACES DE STATISTIQUES =====

export interface BudgetStats {
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
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface SourceBreakdown {
  source: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface DailySpending {
  date: string;
  amount: number;
  cumulativeAmount: number;
}

export interface BudgetComparison {
  currentPeriod: BudgetStats;
  previousPeriod?: BudgetStats;
  changes?: {
    totalSpentChange: number;
    percentageChange: number;
    averageDailyChange: number;
    categoryChanges: CategoryChange[];
  };
}

export interface CategoryChange {
  category: string;
  change: number;
  percentageChange: number;
}

// ===== INTERFACES D'ALERTES =====

export interface BudgetAlert {
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
}

// ===== TYPES DE VALIDATION =====

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface AlertCheck {
  shouldAlert: boolean;
  alertType: BudgetAlert['type'] | null;
}