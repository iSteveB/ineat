import { z } from 'zod';

// ===== SCHÉMAS DE PAGINATION =====

// Paramètres de pagination pour les requêtes
export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().min(1, 'La page doit être supérieure à 0').default(1),
  pageSize: z.coerce.number().int().min(1).max(100, 'La taille de page ne peut pas dépasser 100').default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

// Réponse paginée générique
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) => z.object({
  items: z.array(itemSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

// ===== SCHÉMAS DE RÉPONSES API =====

// Réponse API générique de succès
export const ApiSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  success: z.literal(true),
  message: z.string().optional(),
  data: dataSchema,
  timestamp: z.string().datetime().optional(),
});

export type ApiSuccessResponse<T> = {
  success: true;
  message?: string;
  data: T;
  timestamp?: string;
};

// Réponse API d'erreur
export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  error: z.string().optional(),
  details: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

// Réponse API générique (succès ou erreur)
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([
    ApiSuccessResponseSchema(dataSchema),
    ApiErrorResponseSchema
  ]);

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ===== SCHÉMAS DE FILTRAGE =====

// Filtre par date
export const DateRangeFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: 'La date de début doit être antérieure à la date de fin',
  path: ['endDate'],
});
export type DateRangeFilter = z.infer<typeof DateRangeFilterSchema>;

// Filtre de recherche textuelle
export const SearchFilterSchema = z.object({
  query: z.string().min(1, 'La recherche ne peut pas être vide').optional(),
  fields: z.array(z.string()).optional(), // Champs dans lesquels chercher
});
export type SearchFilter = z.infer<typeof SearchFilterSchema>;

// ===== SCHÉMAS D'UPLOAD DE FICHIERS =====

// Métadonnées de fichier uploadé
export const FileMetadataSchema = z.object({
  filename: z.string(),
  size: z.number().int().positive(),
  mimeType: z.string(),
  uploadedAt: z.string().datetime(),
  url: z.string().url().optional(),
});
export type FileMetadata = z.infer<typeof FileMetadataSchema>;

// ===== SCHÉMAS D'AUDIT ET TIMESTAMPS =====

// Timestamps de création et modification
export const TimestampsSchema = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Timestamps = z.infer<typeof TimestampsSchema>;

// Informations d'audit complètes
export const AuditSchema = TimestampsSchema.extend({
  createdBy: z.string().uuid().optional(),
  updatedBy: z.string().uuid().optional(),
});
export type Audit = z.infer<typeof AuditSchema>;

// ===== SCHÉMAS DE NOTIFICATION =====

// Toast/notification dans l'interface
export const ToastSchema = z.object({
  id: z.string(),
  type: z.enum(['success', 'error', 'warning', 'info']),
  title: z.string(),
  message: z.string().optional(),
  duration: z.number().int().positive().optional(),
  actions: z.array(z.object({
    label: z.string(),
    action: z.string(),
  })).optional(),
});
export type Toast = z.infer<typeof ToastSchema>;

// ===== SCHÉMAS DE PRÉFÉRENCES =====

// Préférences alimentaires utilisateur
export const DietaryPreferencesSchema = z.object({
  diet: z.enum(['OMNIVORE', 'VEGETARIAN', 'VEGAN', 'PESCETARIAN', 'WITHOUT_PORK']).optional(),
  allergies: z.array(z.string()).default([]),
  dislikedIngredients: z.array(z.string()).default([]),
  preferredCuisines: z.array(z.string()).default([]),
  spiceLevel: z.enum(['NONE', 'MILD', 'MEDIUM', 'HOT', 'VERY_HOT']).optional(),
});
export type DietaryPreferences = z.infer<typeof DietaryPreferencesSchema>;

// Préférences d'interface utilisateur
export const UiPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.enum(['fr', 'en']).default('fr'),
  currency: z.enum(['EUR', 'USD', 'GBP', 'CHF']).default('EUR'),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).default('DD/MM/YYYY'),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    expiry: z.boolean().default(true),
    budget: z.boolean().default(true),
  }).default({}),
});
export type UiPreferences = z.infer<typeof UiPreferencesSchema>;

// ===== UTILITAIRES DE VALIDATION =====

/**
 * Schéma pour valider qu'une chaîne n'est pas vide après trim
 */
export const NonEmptyStringSchema = z.string()
  .transform(val => val.trim())
  .refine(val => val.length > 0, 'Ce champ ne peut pas être vide');

/**
 * Schéma pour valider un tableau non vide
 */
export const NonEmptyArraySchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.array(itemSchema).min(1, 'Au moins un élément est requis');

/**
 * Schéma pour valider une date dans le futur
 */
export const FutureDateSchema = z.string().datetime().refine(
  date => new Date(date) > new Date(),
  'La date doit être dans le futur'
);

/**
 * Schéma pour valider une date dans le passé
 */
export const PastDateSchema = z.string().datetime().refine(
  date => new Date(date) <= new Date(),
  'La date ne peut pas être dans le futur'
);

/**
 * Crée un schéma optionnel qui accepte aussi les chaînes vides
 */
export const OptionalOrEmptySchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([
    schema,
    z.literal(''),
    z.undefined(),
    z.null(),
  ]).transform(async (val) => val === '' || val === null || val === undefined ? undefined : val);

// ===== CONSTANTES UTILES =====

export const COMMON_STORAGE_LOCATIONS = [
  'Réfrigérateur',
  'Congélateur',
  'Placard',
  'Cave',
  'Garage',
  'Autre',
] as const;

export const COMMON_CURRENCIES = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF',
} as const;

export const DATE_FORMATS = {
  'DD/MM/YYYY': 'DD/MM/YYYY',
  'MM/DD/YYYY': 'MM/DD/YYYY',
  'YYYY-MM-DD': 'YYYY-MM-DD',
} as const;