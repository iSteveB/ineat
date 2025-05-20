import { z } from 'zod';

// Schéma pour les dépenses
export const ExpenseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  budgetId: z.string(),
  amount: z.number(),
  date: z.date(),
  source: z.string().optional(),
  receiptId: z.string().optional(),
});
export type Expense = z.infer<typeof ExpenseSchema>;

// Schéma pour le budget
export const BudgetSchema = z.object({
  id: z.string(),
  userId: z.string(),
  amount: z.number(),
  spent: z.number(),
  periodStart: z.date(),
  periodEnd: z.date(),
  expenses: z.array(ExpenseSchema),
});
export type Budget = z.infer<typeof BudgetSchema>;