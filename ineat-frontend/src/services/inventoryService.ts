import { apiClient } from '@/lib/api-client';
import { AddManualProductInput, InventoryFilters } from '@/schemas/productSchema';

// Types pour les réponses de l'API d'inventaire
export interface InventoryItemResponse {
  id: string;
  quantity: number;
  expiryDate: string | null;
  purchaseDate: string;
  purchasePrice: number | null;
  storageLocation: string | null;
  notes: string | null;
  product: {
    id: string;
    name: string;
    brand: string | null;
    nutriscore: 'A' | 'B' | 'C' | 'D' | 'E' | null;
    ecoScore: 'A' | 'B' | 'C' | 'D' | 'E' | null;
    novaScore: 'A' | 'B' | 'C' | 'D' | null;
    unitType: 'KG' | 'G' | 'L' | 'ML' | 'UNIT';
    imageUrl: string | null;
    nutrients: {
      carbohydrates?: number;
      proteins?: number;
      fats?: number;
      salt?: number;
      calories?: number;
      [key: string]: number | undefined;
    } | null;
    category: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

export interface ProductCreatedResponse {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  quantity: number;
  unitType: 'KG' | 'G' | 'L' | 'ML' | 'UNIT';
  purchaseDate: string;
  expiryDate: string | null;
  purchasePrice: number | null;
  storageLocation: string | null;
  notes: string | null;
  nutriscore: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  ecoscore: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryStatsResponse {
  totalItems: number;
  totalValue: number;
  expiringInWeek: number;
  categoriesBreakdown: Array<{
    categoryName: string;
    count: number;
    percentage: number;
  }>;
  storageBreakdown: Record<string, number>;
}

export interface UpdateInventoryItemInput {
  quantity?: number;
  expiryDate?: string | null;
  storageLocation?: string | null;
  notes?: string | null;
  purchasePrice?: number | null;
}

/**
 * Service pour gérer les opérations d'inventaire
 */
export const inventoryService = {
  /**
   * Récupère l'inventaire complet de l'utilisateur avec filtres optionnels
   */
  async getInventory(filters?: InventoryFilters): Promise<InventoryItemResponse[]> {
    const searchParams = new URLSearchParams();
    
    if (filters?.category) {
      searchParams.append('category', filters.category);
    }
    
    if (filters?.storageLocation) {
      searchParams.append('storageLocation', filters.storageLocation);
    }
    
    if (filters?.expiringWithinDays !== undefined) {
      searchParams.append('expiringWithinDays', filters.expiringWithinDays.toString());
    }
    
    const queryString = searchParams.toString();
    const endpoint = `/inventory${queryString ? `?${queryString}` : ''}`;
    
    return await apiClient.get<InventoryItemResponse[]>(endpoint);
  },

  /**
   * Ajoute un produit manuellement à l'inventaire
   */
  async addManualProduct(productData: AddManualProductInput): Promise<ProductCreatedResponse> {
    return await apiClient.post<ProductCreatedResponse>('/inventory/products', productData);
  },

  /**
   * Met à jour un élément d'inventaire
   */
  async updateInventoryItem(
    inventoryItemId: string, 
    updates: UpdateInventoryItemInput
  ): Promise<InventoryItemResponse> {
    return await apiClient.put<InventoryItemResponse>(`/inventory/${inventoryItemId}`, updates);
  },

  /**
   * Supprime un élément d'inventaire
   */
  async removeInventoryItem(inventoryItemId: string): Promise<void> {
    return await apiClient.delete<void>(`/inventory/${inventoryItemId}`);
  },

  /**
   * Récupère les statistiques de l'inventaire
   */
  async getInventoryStats(): Promise<InventoryStatsResponse> {
    return await apiClient.get<InventoryStatsResponse>('/inventory/stats');
  },
};