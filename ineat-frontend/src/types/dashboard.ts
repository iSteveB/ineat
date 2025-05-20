import { z } from 'zod';
import { UserSchema } from './user';
import { ProductSchema } from './product';
import { BudgetSchema } from './budget';

// Schéma pour l'historique Nutriscore
export const NutriscoreHistorySchema = z.object({
  date: z.date(),
  score: z.number(), // Valeur numérique (1-5) correspondant au Nutriscore (A=5, B=4, C=3, D=2, E=1)
});
export type NutriscoreHistory = z.infer<typeof NutriscoreHistorySchema>;

// Schéma pour les données du dashboard
export const DashboardDataSchema = z.object({
  user: UserSchema,
  inventory: z.array(ProductSchema),
  budget: BudgetSchema,
  nutriscoreHistory: z.array(NutriscoreHistorySchema),
});
export type DashboardData = z.infer<typeof DashboardDataSchema>;