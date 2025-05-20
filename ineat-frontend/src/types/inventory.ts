import { z } from 'zod';
import { ProductSchema } from './product';

// Schéma pour un élément d'inventaire
export const InventoryItemSchema = z.object({
  id: z.string(),
  product: ProductSchema,
  quantity: z.number(),
  expiryDate: z.string().optional(),
  purchaseDate: z.string(),
  purchasePrice: z.number().optional(),
  storageLocation: z.string(),
  unity: z.string(),
});
export type InventoryItem = z.infer<typeof InventoryItemSchema>;

// Interface pour le state du store d'inventaire
export interface InventoryState {
  items: InventoryItem[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchInventoryItems: () => Promise<void>;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  removeInventoryItem: (id: string) => Promise<void>;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
}