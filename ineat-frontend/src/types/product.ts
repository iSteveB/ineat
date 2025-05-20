import { z } from 'zod';

// Énumérations
export const NutriScoreSchema = z.enum(['A', 'B', 'C', 'D', 'E']).nullable().optional();
export type NutriScore = z.infer<typeof NutriScoreSchema>;

export const EcoScoreSchema = z.enum(['A', 'B', 'C', 'D', 'E']);
export type EcoScore = z.infer<typeof EcoScoreSchema>;

export const UnitTypeSchema = z.enum(['KG', 'G', 'L', 'ML', 'UNIT']);
export type UnitType = z.infer<typeof UnitTypeSchema>;

export const StorageLocationSchema = z.enum(['FRESH', 'FREEZER', 'PANTRY', 'ALL']);
export type StorageLocation = z.infer<typeof StorageLocationSchema>;

export const ProductCategorySchema = z.enum([
  'ALL',
  'FRUIT',
  'VEGETABLE',
  'MEAT',
  'FISH',
  'DAIRY',
  'SNACK',
  'BEVERAGE',
  'LEGUME',
  'EGGS',
  'CEREAL',
  'STARCHE',
  'SPICE',
  'SWEET',
  'FAT',
  'SUGAR',
  'READY_MEAL',
  'OTHER'
]);
export type ProductCategory = z.infer<typeof ProductCategorySchema>;

// Schéma pour les produits
export const ProductSchema = z.object({
  id: z.string(),
  barcode: z.string().optional(),
  name: z.string(),
  brand: z.string(),
  category: ProductCategorySchema.optional(),
  description: z.string().optional(),
  quantity: z.number().optional(),
  unitType: UnitTypeSchema.optional(),
  unit: z.string().optional(),
  nutriscore: NutriScoreSchema.optional() || z.string().optional(),
  ecoScore: EcoScoreSchema.optional() || z.string().optional(),
  nutrients: z.record(z.unknown()).optional(), // Informations nutritionnelles en JSON
  imageUrl: z.string().optional(),
  externalId: z.string().optional(), // ID dans OpenFoodFacts
  storageLocation: StorageLocationSchema.optional(),
  isOpen: z.boolean().optional(),
  purchaseDate: z.date().optional(),
  expiryDate: z.date().optional(),
  price: z.number().optional(),
});
export type Product = z.infer<typeof ProductSchema>;

// Ajout du statut d'expiration au produit
import { ExpiryStatusType } from './common';
export const ProductWithExpiryStatusSchema = ProductSchema.extend({
  expiryStatus: z.custom<ExpiryStatusType>(),
});
export type ProductWithExpiryStatus = z.infer<typeof ProductWithExpiryStatusSchema>;

// Schéma pour les catégories de produits
export const ProductCategoryEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().optional(),
  icon: z.string().optional(),
});
export type ProductCategoryEntity = z.infer<typeof ProductCategoryEntitySchema>;
