import { z } from 'zod';

// Types pour les statuts d'expiration
export const ExpiryStatusSchema = z.enum(['GOOD', 'WARNING', 'CRITICAL', 'EXPIRED', 'UNKNOWN']);
export type ExpiryStatusType = z.infer<typeof ExpiryStatusSchema>;

// Fonction utilitaire pour calculer le statut d'expiration
export const calculateExpiryStatus = (expiryDate?: Date | null): ExpiryStatusType => {
  if (!expiryDate) return 'UNKNOWN';
  
  const daysRemaining = Math.floor((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining < 0) return 'EXPIRED';
  if (daysRemaining <= 2) return 'CRITICAL';
  if (daysRemaining <= 5) return 'WARNING';
  return 'GOOD';
};

// Schema pour les éléments paginés
export const PaginatedResultSchema = <T extends z.ZodTypeAny>(itemSchema: T) => z.object({
  items: z.array(itemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// Types pour les requêtes de pagination
export const PaginationParamsSchema = z.object({
  page: z.number().optional().default(1),
  pageSize: z.number().optional().default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

// Schema générique pour les réponses API
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: dataSchema.optional(),
  error: z.string().optional(),
});

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
};