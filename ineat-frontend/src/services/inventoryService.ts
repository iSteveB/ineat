/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from '@/lib/api-client';
import {
  AddManualProductInput,
  ProductCreatedResponse,
  ProductCreatedResponseSchema,
  InventoryItem,
  InventoryItemSchema,
  InventoryFilters,
  InventoryStats,
  InventoryStatsSchema,
} from '@/schemas/productSchema';

/**
 * Service pour les opérations liées à l'inventaire
 */
export const inventoryApi = {
  /**
   * Ajoute un produit manuellement à l'inventaire
   * @param productData Données du produit à ajouter
   * @returns Promise<ProductCreatedResponse>
   */
  async addManualProduct(productData: AddManualProductInput): Promise<ProductCreatedResponse> {
    try {
      // Préparer les données pour l'API (transformation si nécessaire)
      const apiData = {
        ...productData,
        // Transformer la date de péremption vide en undefined
        expiryDate: productData.expiryDate === '' ? undefined : productData.expiryDate,
        // Construire l'objet nutritionalInfo seulement si au moins une valeur est définie
        nutritionalInfo: productData.nutritionalInfo && 
          Object.values(productData.nutritionalInfo).some(value => value !== undefined) 
          ? productData.nutritionalInfo 
          : undefined,
      };

      const response = await apiClient.fetch<ProductCreatedResponse>('/inventory/products', {
        method: 'POST',
        body: JSON.stringify(apiData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Valider la réponse avec Zod
      return ProductCreatedResponseSchema.parse(response);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du produit:', error);
      throw error;
    }
  },

  /**
   * Récupère l'inventaire de l'utilisateur avec filtres optionnels
   * @param filters Filtres optionnels
   * @returns Promise<InventoryItem[]>
   */
  async getUserInventory(filters?: InventoryFilters): Promise<InventoryItem[]> {
    try {
      // Construire les paramètres de requête
      const searchParams = new URLSearchParams();
      
      if (filters?.category) {
        searchParams.append('category', filters.category);
      }
      
      if (filters?.storageLocation) {
        searchParams.append('storageLocation', filters.storageLocation);
      }
      
      if (filters?.expiringWithinDays) {
        searchParams.append('expiringWithinDays', filters.expiringWithinDays.toString());
      }

      const queryString = searchParams.toString();
      const endpoint = queryString ? `/inventory?${queryString}` : '/inventory';

      const response = await apiClient.fetch<unknown[]>(endpoint);

      // Valider chaque élément de la réponse et les transformer au format attendu
      return response.map((item: any) => {
        return InventoryItemSchema.parse({
          id: item.id,
          quantity: item.quantity,
          expiryDate: item.expiryDate,
          purchaseDate: item.purchaseDate,
          purchasePrice: item.purchasePrice,
          storageLocation: item.storageLocation,
          notes: item.notes,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          product: {
            id: item.product.id,
            name: item.product.name,
            brand: item.product.brand,
            nutriscore: item.product.nutriscore,
            ecoScore: item.product.ecoScore,
            unitType: item.product.unitType,
            imageUrl: item.product.imageUrl,
            category: {
              id: item.product.category.id,
              name: item.product.category.name,
              slug: item.product.category.slug,
              icon: item.product.category.icon,
            },
          },
        });
      });
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'inventaire:', error);
      throw error;
    }
  },

  /**
   * Met à jour un élément d'inventaire
   * @param inventoryItemId ID de l'élément à mettre à jour
   * @param updateData Données à mettre à jour
   * @returns Promise<InventoryItem>
   */
  async updateInventoryItem(
    inventoryItemId: string,
    updateData: {
      quantity?: number;
      expiryDate?: string;
      storageLocation?: string;
      notes?: string;
      purchasePrice?: number;
    },
  ): Promise<InventoryItem> {
    try {
      const response = await apiClient.fetch<any>(`/inventory/${inventoryItemId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Transformer la réponse au format attendu
      return InventoryItemSchema.parse({
        id: response.id,
        quantity: response.quantity,
        expiryDate: response.expiryDate,
        purchaseDate: response.purchaseDate,
        purchasePrice: response.purchasePrice,
        storageLocation: response.storageLocation,
        notes: response.notes,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
        product: {
          id: response.product.id,
          name: response.product.name,
          brand: response.product.brand,
          nutriscore: response.product.nutriscore,
          ecoScore: response.product.ecoScore,
          unitType: response.product.unitType,
          imageUrl: response.product.imageUrl,
          category: {
            id: response.product.category.id,
            name: response.product.category.name,
            slug: response.product.category.slug,
            icon: response.product.category.icon,
          },
        },
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'élément d\'inventaire:', error);
      throw error;
    }
  },

  /**
   * Supprime un élément d'inventaire
   * @param inventoryItemId ID de l'élément à supprimer
   * @returns Promise<{ success: boolean; message: string }>
   */
  async removeInventoryItem(inventoryItemId: string): Promise<{ success: boolean; message: string }> {
    try {
      await apiClient.fetch(`/inventory/${inventoryItemId}`, {
        method: 'DELETE',
      });

      return { success: true, message: 'Produit supprimé avec succès' };
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'élément d\'inventaire:', error);
      throw error;
    }
  },

  /**
   * Récupère les statistiques de l'inventaire
   * @returns Promise<InventoryStats>
   */
  async getInventoryStats(): Promise<InventoryStats> {
    try {
      const response = await apiClient.fetch<InventoryStats>('/inventory/stats');
      
      return InventoryStatsSchema.parse(response);
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  },

  /**
   * Recherche de produits par nom ou code-barres (pour l'autocomplete)
   * @param query Terme de recherche
   * @returns Promise<Array<{ id: string; name: string; brand?: string }>>
   */
  async searchProducts(query: string): Promise<Array<{ id: string; name: string; brand?: string }>> {
    try {
      const searchParams = new URLSearchParams({ q: query });
      const response = await apiClient.fetch<Array<{ id: string; name: string; brand?: string }>>(
        `/products/search?${searchParams}`,
      );

      // Validation simple pour la recherche
      return response.filter(item => 
        typeof item.id === 'string' && 
        typeof item.name === 'string' && 
        (item.brand === undefined || typeof item.brand === 'string')
      );
    } catch (error) {
      console.error('Erreur lors de la recherche de produits:', error);
      throw error;
    }
  },
};

/**
 * Types d'erreur spécifiques à l'inventaire
 */
export class InventoryError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'InventoryError';
  }
}

/**
 * Utilitaire pour gérer les erreurs API d'inventaire
 * @param error Erreur capturée
 * @returns InventoryError avec un message adapté
 */
export function handleInventoryError(error: unknown): InventoryError {
  if (error instanceof InventoryError) {
    return error;
  }

  if (error && typeof error === 'object' && 'statusCode' in error) {
    const apiError = error as { statusCode: number; message: string; code?: string };
    
    switch (apiError.statusCode) {
      case 400:
        return new InventoryError(
          'Les données saisies sont invalides. Veuillez vérifier votre formulaire.',
          400,
          'VALIDATION_ERROR',
        );
      case 404:
        if (apiError.message.includes('catégorie')) {
          return new InventoryError(
            'La catégorie sélectionnée n\'existe pas.',
            404,
            'CATEGORY_NOT_FOUND',
          );
        }
        return new InventoryError(
          'L\'élément demandé est introuvable.',
          404,
          'NOT_FOUND',
        );
      case 409:
        return new InventoryError(
          'Ce produit existe déjà dans votre inventaire avec les mêmes caractéristiques.',
          409,
          'DUPLICATE_PRODUCT',
        );
      default:
        return new InventoryError(
          apiError.message || 'Une erreur s\'est produite lors de l\'opération.',
          apiError.statusCode,
          apiError.code,
        );
    }
  }

  return new InventoryError(
    'Une erreur inattendue s\'est produite. Veuillez réessayer.',
    500,
    'UNKNOWN_ERROR',
  );
}