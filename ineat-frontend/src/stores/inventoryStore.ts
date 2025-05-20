import { create } from 'zustand';
import { InventoryItem, InventoryState } from '@/types/inventory';

// Définition du store d'inventaire avec Zustand
export const useInventoryStore = create<InventoryState>((set) => ({
  items: [],
  isLoading: false,
  error: null,
  
  // Récupérer tous les éléments d'inventaire
  fetchInventoryItems: async () => {
    set({ isLoading: true });
    try {
      // Pour le développement, utilisons des données mockées
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
  addInventoryItem: async (item: Omit<InventoryItem, 'id'>) => {
    set({ isLoading: true });
    try {
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
  updateInventoryItem: async (id: string, updates: Partial<InventoryItem>) => {
    set({ isLoading: true });
    try {
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

const mockInventoryData: InventoryItem[] = [
  {
    id: '1',
    product: {
      id: '101',
      name: 'Lait demi-écrémé',
      brand: 'Carrefour',
      nutriscore: 'B',
      ecoScore: 'B',
    },
    unity: 'L',
    quantity: 1,
    expiryDate: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString(),
    purchaseDate: new Date().toISOString(),
    storageLocation: 'Cellier',
  },
  {
    id: '2',
    product: {
      id: '102',
      name: 'Yaourt nature',
      brand: 'Danone',
      nutriscore: 'A',
      ecoScore: 'C',
    },
    quantity: 4,
    expiryDate: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
    purchaseDate: new Date().toISOString(),
    storageLocation: 'Frigo',
    unity: 'p.',
  },
  {
    id: '3',
    product: {
      id: '103',
      name: 'Poulet entier',
      brand: 'Loué',
      nutriscore: 'A',
      ecoScore: 'B',
    },
    quantity: 1,
    expiryDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
    purchaseDate: new Date().toISOString(),
    storageLocation: 'Frigo',
    unity: 'kg',
  },
  {
    id: '4',
    product: {
      id: '104',
      name: 'Pizza surgelée',
      brand: 'Buitoni',
      nutriscore: 'C',
      ecoScore: 'D',
    },
    quantity: 2,
    expiryDate: new Date(new Date().setDate(new Date().getDate() + 90)).toISOString(),
    purchaseDate: new Date().toISOString(),
    storageLocation: 'Congélateur',
    unity: 'p.',
  },
  {
    id: '5',
    product: {
      id: '105',
      name: 'Pâtes complètes',
      brand: 'Panzani',
      nutriscore: 'A',
      ecoScore: 'B',
    },
    quantity: 1,
    expiryDate: new Date(new Date().setDate(new Date().getDate() + 365)).toISOString(),
    purchaseDate: new Date().toISOString(),
    storageLocation: 'Placard',
    unity: 'kg',
  },
];

async function mockFetchInventoryItems(): Promise<InventoryItem[]> {
  // Simuler un délai réseau
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...mockInventoryData];
}

function mockAddInventoryItem(item: Omit<InventoryItem, 'id'>): InventoryItem {
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

function mockUpdateInventoryItem(id: string, updates: Partial<InventoryItem>): InventoryItem {
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