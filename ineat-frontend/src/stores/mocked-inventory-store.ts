import { create } from 'zustand';
import { Product } from '@/types/product';

// Interface du state du store
interface InventoryState {
  items: Product[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchInventoryItems: () => Promise<void>;
  addInventoryItem: (item: Omit<Product, 'id'>) => Promise<void>;
  removeInventoryItem: (id: string) => Promise<void>;
  updateInventoryItem: (id: string, updates: Partial<Product>) => Promise<void>;
}

// Création du store Zustand
export const useInventoryStore = create<InventoryState>((set) => ({
  items: [],
  isLoading: false,
  error: null,
  
  // Récupérer tous les éléments d'inventaire
  fetchInventoryItems: async () => {
    set({ isLoading: true });
    try {
      // Pour le développement, utilisons des données mockées
      // En production, ce serait: const data = await apiClient.fetch<Product[]>('/api/inventory');
      const data = await mockFetchInventoryItems();
      set({ items: data, isLoading: false, error: null });
    } catch (error) {
      console.error("Erreur lors de la récupération de l'inventaire:", error);
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Une erreur est survenue' 
      });
    }
  },
  
  // Ajouter un nouvel élément à l'inventaire
  addInventoryItem: async (item: Omit<Product, 'id'>) => {
    set({ isLoading: true });
    try {
      // En production: const data = await apiClient.fetch<Product>('/api/inventory', { method: 'POST', body: item });
      const data = mockAddInventoryItem(item);
      set(state => ({ 
        items: [...state.items, data],
        isLoading: false,
        error: null
      }));
    } catch (error) {
      console.error("Erreur lors de l'ajout d'un élément à l'inventaire:", error);
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Une erreur est survenue' 
      });
    }
  },
  
  // Supprimer un élément de l'inventaire
  removeInventoryItem: async (id: string) => {
    set({ isLoading: true });
    try {
      // En production: await apiClient.fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      await mockRemoveInventoryItem(id);
      set(state => ({ 
        items: state.items.filter(item => item.id !== id),
        isLoading: false,
        error: null
      }));
    } catch (error) {
      console.error("Erreur lors de la suppression d'un élément de l'inventaire:", error);
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Une erreur est survenue' 
      });
    }
  },
  
  // Mettre à jour un élément de l'inventaire
  updateInventoryItem: async (id: string, updates: Partial<Product>) => {
    set({ isLoading: true });
    try {
      // En production: const data = await apiClient.fetch<Product>(`/api/inventory/${id}`, { method: 'PATCH', body: updates });
      const data = mockUpdateInventoryItem(id, updates);
      set(state => ({ 
        items: state.items.map(item => item.id === id ? data : item),
        isLoading: false,
        error: null
      }));
    } catch (error) {
      console.error("Erreur lors de la mise à jour d'un élément de l'inventaire:", error);
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Une erreur est survenue' 
      });
    }
  },
}));

// Données mockées pour le développement
// Ces fonctions seraient remplacées par de vraies requêtes API en production

const mockInventoryData: Product[] = [
  {
    id: '101',
    name: 'Lait demi-écrémé',
    brand: 'Carrefour',
    nutriscore: 'B',
    ecoScore: 'B',
    storageLocation: 'FRESH',
    category: 'DAIRY',
    ingredients: ['Lait demi-écrémé pasteurisé', 'vitamines D et B12'],
    allergens: ['Lait'],
    imageUrl: 'https://www.carrefour.fr/media/540x540/Photosite/PGC/EPICERIE/0000000000000_PHOTO_HD_L.jpg',
    unitType: 'L',
    quantity: 6,
    expiryDate: new Date(new Date().setDate(new Date().getDate() + 14)),
    purchaseDate: new Date(),
    nutrients: {
      fat: 1.55,
      saturatedFat: 1.0,
      sugar: 4.8,
      salt: 0.1,
      calories: 46
    },
    isOpen: false,
    price: 0.95
  },
  {
    id: '102',
    name: 'Coca Cola',
    brand: 'Coca-Cola',
    nutriscore:'E',
    ecoScore: 'D',
    storageLocation: 'PANTRY',
    category: 'BEVERAGE',
    ingredients: [
      'Eau', 
      'sucre', 
      'colorant E150d', 
      'acidifiant : E338', 
      'arômes naturels incl. caféine'
    ],
    imageUrl: 'https://www.carrefour.fr/media/540x540/Photosite/PGC/BOISSONS/5449000000996_PHOTO_HD_L.jpg',
    unitType: 'L',
    quantity: 6,
    expiryDate: new Date(new Date().setDate(new Date().getDate() + 16)),
    purchaseDate: new Date(),
    nutrients: {
      fat: 0,
      saturatedFat: 0,
      sugar: 10.6,
      salt: 0,
      calories: 42
    },
    isOpen: false,
    price: 1.99
  },
  {
    id: '103',
    name: 'Yaourt nature',
    brand: 'Danone',
    nutriscore: 'A',
    ecoScore: 'C',
    storageLocation: 'FRESH',
    category: 'DAIRY',
    ingredients: [
      'Lait écrémé pasteurisé', 
      'protéines de lait', 
      'ferments lactiques'
    ],
    allergens: ['Lait'],
    imageUrl: 'https://www.carrefour.fr/media/540x540/Photosite/PGC/FRAIS/3033490004521_PHOTO_HD_L.jpg',
    unitType: 'G',
    quantity: 4,
    expiryDate: new Date(new Date().setDate(new Date().getDate() + 5)),
    purchaseDate: new Date(),
    nutrients: {
      fat: 0.1,
      saturatedFat: 0.1,
      sugar: 4.0,
      salt: 0.12,
      calories: 56
    },
    isOpen: false,
    price: 2.45
  },
  {
    id: '104',
    name: 'Poulet entier',
    brand: 'Loué',
    nutriscore: 'A',
    ecoScore: 'B',
    storageLocation: 'FRESH',
    category: 'MEAT',
    ingredients: ['Poulet entier', 'sel'],
    imageUrl: 'https://www.carrefour.fr/media/540x540/Photosite/PGC/FRPAT/3273624493314_PHOTO_HD_L.jpg',
    unitType: 'KG',
    quantity: 1.5,
    expiryDate: new Date(new Date().setDate(new Date().getDate() + 2)),
    purchaseDate: new Date(),
    nutrients: {
      fat: 9.3,
      saturatedFat: 2.5,
      sugar: 0,
      salt: 0.4,
      calories: 166
    },
    isOpen: false,
    price: 8.95
  },
  {
    id: '105',
    name: 'Pizza surgelée',
    brand: 'Buitoni',
    nutriscore: 'C',
    ecoScore: 'D',
    storageLocation: 'FREEZER',
    category: 'READY_MEAL',
    ingredients: [
      'Farine de blé', 
      'mozzarella (18%)', 
      'sauce tomate (15%)', 
      'jambon cuit (10%)', 
      'champignons (8%)', 
      "huile d'olive", 
      'sel', 
      'levure', 
      'épices'
    ],
    allergens: ['Gluten', 'Lait'],
    imageUrl: 'https://www.carrefour.fr/media/540x540/Photosite/PGC/SURGELES/3033710065967_PHOTO_HD_L.jpg',
    unitType: 'G',
    quantity: 2,
    expiryDate: new Date(new Date().setDate(new Date().getDate() + 90)),
    purchaseDate: new Date(),
    nutrients: {
      fat: 11.2,
      saturatedFat: 5.6,
      sugar: 3.2,
      salt: 1.4,
      calories: 266
    },
    isOpen: false,
    price: 4.50
  },
  {
    id: '106',
    name: 'Pâtes complètes',
    brand: 'Panzani',
    nutriscore: 'A',
    ecoScore: 'B',
    storageLocation: 'PANTRY',
    category: 'CEREAL',
    ingredients: ['Semoule de blé complet'],
    allergens: ['Gluten'],
    imageUrl: 'https://www.carrefour.fr/media/540x540/Photosite/PGC/EPICERIE/8000139910784_PHOTO_HD_L.jpg',
    unitType: 'G',
    quantity: 500,
    expiryDate: new Date(new Date().setDate(new Date().getDate() + 365)),
    purchaseDate: new Date(),
    nutrients: {
      fat: 2.5,
      saturatedFat: 0.5,
      sugar: 3.0,
      salt: 0.01,
      calories: 350
    },
    isOpen: false,
    price: 1.25
  },
];

async function mockFetchInventoryItems(): Promise<Product[]> {
  // Simuler un délai réseau
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...mockInventoryData];
}

function mockAddInventoryItem(item: Omit<Product, 'id'>): Product {
  const newItem = {
    ...item,
    id: Math.random().toString(36).substring(2, 9),
  };
  mockInventoryData.push(newItem);
  return newItem;
}

async function mockRemoveInventoryItem(id: string): Promise<void> {
  // Simuler un délai réseau
  await new Promise(resolve => setTimeout(resolve, 300));
  const index = mockInventoryData.findIndex(item => item.id === id);
  if (index !== -1) {
    mockInventoryData.splice(index, 1);
  }
}

function mockUpdateInventoryItem(id: string, updates: Partial<Product>): Product {
  const index = mockInventoryData.findIndex(item => item.id === id);
  if (index === -1) {
    throw new Error('Élément non trouvé');
  }
  
  const updatedItem = {
    ...mockInventoryData[index],
    ...updates,
  };
  
  mockInventoryData[index] = updatedItem;
  return updatedItem;
}