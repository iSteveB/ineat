import { z } from 'zod';

// Enums correspondant au backend
export const UnitTypeSchema = z.enum(['KG', 'G', 'L', 'ML', 'UNIT']);
export const NutriScoreSchema = z.enum(['A', 'B', 'C', 'D', 'E']);
export const EcoScoreSchema = z.enum(['A', 'B', 'C', 'D', 'E']);

export type UnitType = z.infer<typeof UnitTypeSchema>;
export type NutriScore = z.infer<typeof NutriScoreSchema>;
export type EcoScore = z.infer<typeof EcoScoreSchema>;

// Schéma pour les informations nutritionnelles
export const NutritionalInfoSchema = z.object({
  carbohydrates: z.coerce.number().min(0, 'Les glucides ne peuvent pas être négatifs').optional(),
  proteins: z.coerce.number().min(0, 'Les protéines ne peuvent pas être négatives').optional(),
  fats: z.coerce.number().min(0, 'Les lipides ne peuvent pas être négatifs').optional(),
  salt: z.coerce.number().min(0, 'Le sel ne peut pas être négatif').optional(),
});

export type NutritionalInfo = z.infer<typeof NutritionalInfoSchema>;

// Schéma principal pour l'ajout de produit manuel
export const AddManualProductSchema = z.object({
  name: z.string()
    .min(1, 'Le nom du produit est obligatoire')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .transform(val => val.trim()),
  
  brand: z.string()
    .max(50, 'La marque ne peut pas dépasser 50 caractères')
    .transform(val => val.trim() || undefined)
    .optional(),
    
  category: z.string()
    .min(1, 'La catégorie est obligatoire'),
    
  quantity: z.coerce.number()
    .min(0.01, 'La quantité doit être supérieure à 0')
    .max(10000, 'La quantité semble trop importante'),
    
  unitType: UnitTypeSchema,
  
  purchaseDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)')
    .refine(date => {
      const parsed = new Date(date);
      const now = new Date();
      now.setHours(23, 59, 59, 999); // Fin de journée
      return parsed <= now;
    }, 'La date d\'achat ne peut pas être dans le futur'),
    
  expiryDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)')
    .optional()
    .or(z.literal('')),
    
  purchasePrice: z.coerce.number()
    .min(0, 'Le prix ne peut pas être négatif')
    .max(1000, 'Le prix semble trop élevé')
    .optional(),
    
  storageLocation: z.string()
    .max(50, 'Le lieu de stockage ne peut pas dépasser 50 caractères')
    .optional(),
    
  notes: z.string()
    .max(500, 'Les notes ne peuvent pas dépasser 500 caractères')
    .transform(val => val.trim() || undefined)
    .optional(),
    
  nutriscore: NutriScoreSchema.optional(),
  ecoscore: EcoScoreSchema.optional(),
  
  nutritionalInfo: NutritionalInfoSchema.optional(),
}).refine(data => {
  // Validation croisée : date de péremption doit être après la date d'achat
  if (data.expiryDate && data.expiryDate !== '') {
    const purchaseDate = new Date(data.purchaseDate);
    const expiryDate = new Date(data.expiryDate);
    return expiryDate > purchaseDate;
  }
  return true;
}, {
  message: 'La date de péremption doit être postérieure à la date d\'achat',
  path: ['expiryDate'],
});

export type AddManualProductInput = z.infer<typeof AddManualProductSchema>;

// Schéma pour la réponse du serveur après création
export const ProductCreatedResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  brand: z.string().optional(),
  category: z.string(),
  quantity: z.number(),
  unitType: UnitTypeSchema,
  purchaseDate: z.string(),
  expiryDate: z.string().optional(),
  purchasePrice: z.number().optional(),
  storageLocation: z.string().optional(),
  notes: z.string().optional(),
  nutriscore: NutriScoreSchema.optional(),
  ecoscore: EcoScoreSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProductCreatedResponse = z.infer<typeof ProductCreatedResponseSchema>;

// Schéma pour un élément d'inventaire complet (avec produit)
export const InventoryItemSchema = z.object({
  id: z.string().uuid(),
  quantity: z.number(),
  expiryDate: z.string().datetime().optional(),
  purchaseDate: z.string().datetime(),
  purchasePrice: z.number().optional(),
  storageLocation: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  product: z.object({
    id: z.string().uuid(),
    name: z.string(),
    brand: z.string().optional(),
    nutriscore: NutriScoreSchema.optional(),
    ecoScore: EcoScoreSchema.optional(),
    unitType: UnitTypeSchema,
    imageUrl: z.string().optional(),
    category: z.object({
      id: z.string().uuid(),
      name: z.string(),
      slug: z.string(),
      icon: z.string().optional(),
    }),
  }),
});

export type InventoryItem = z.infer<typeof InventoryItemSchema>;

// Schéma pour les filtres d'inventaire
export const InventoryFiltersSchema = z.object({
  category: z.string().optional(),
  storageLocation: z.string().optional(),
  expiringWithinDays: z.coerce.number().int().min(1).max(365).optional(),
});

export type InventoryFilters = z.infer<typeof InventoryFiltersSchema>;

// Schéma pour les statistiques d'inventaire
export const InventoryStatsSchema = z.object({
  totalItems: z.number(),
  totalValue: z.number(),
  expiringInWeek: z.number(),
  categoriesBreakdown: z.array(z.object({
    categoryName: z.string(),
    count: z.number(),
    percentage: z.number(),
  })),
  storageBreakdown: z.record(z.string(), z.number()),
});

export type InventoryStats = z.infer<typeof InventoryStatsSchema>;