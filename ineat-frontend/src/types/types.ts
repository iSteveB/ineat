export type ProductCategory = 
  | 'fruits' 
  | 'légumes' 
  | 'viandes' 
  | 'poissons' 
  | 'produits laitiers' 
  | 'épicerie' 
  | 'boissons' 
  | 'surgelés'
  | 'plats préparés'
  | 'autres';

export type StorageLocation = 
  | 'Frais' 
  | 'Surgelé' 
  | 'Sec'
  | 'autre';

export type NutriScore = 'A' | 'B' | 'C' | 'D' | 'E';
export type EcoScore = 'A' | 'B' | 'C' | 'D' | 'E';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  nutriscore: NutriScore;
  ecoscore: EcoScore;
  quantity: number;
  unit: string;
  expiryDate: Date;
  purchaseDate: Date;
  price?: number;
  storageLocation: StorageLocation;
  imageUrl?: string;
  isOpen: boolean;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileType: 'FAMILY' | 'STUDENT' | 'SINGLE';
  subscription: 'FREE' | 'PREMIUM' | 'ADMIN';
  preferences: {
    diet?: 'OMNIVORE' | 'VEGETARIAN' | 'VEGAN' | 'PESCETARIAN';
    allergies?: string[];
    dislikedIngredients?: string[];
  };
}

export interface Budget {
  id: string;
  userId: string;
  amount: number;
  spent: number;
  periodStart: Date;
  periodEnd: Date;
  expenses: Expense[];
}

export interface Expense {
  id: string;
  userId: string;
  budgetId: string;
  amount: number;
  date: Date;
  source?: string;
  receiptId?: string;
}

export interface NutriscoreHistory {
  date: Date;
  score: number; // Valeur numérique (1-5) correspondant au Nutriscore (A=5, B=4, C=3, D=2, E=1)
}

export interface DashboardData {
  user: User;
  inventory: Product[];
  budget: Budget;
  nutriscoreHistory: NutriscoreHistory[];
}

// Utilitaires pour le calcul d'expiration
export const ExpiryStatus = {
  EXPIRED: 'expired',
  CRITICAL: 'critical', // Moins de 2 jours
  WARNING: 'warning',   // Entre 2 et 5 jours
  GOOD: 'good'          // Plus de 5 jours
} as const;

export type ExpiryStatusType = typeof ExpiryStatus[keyof typeof ExpiryStatus];

export interface ProductWithExpiryStatus extends Product {
  expiryStatus: ExpiryStatusType;
}