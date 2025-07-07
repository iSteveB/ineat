// Type pour les emplacements de stockage (catégories de filtrage)
export type StorageLocation = 'ALL' | 'FRESH' | 'FREEZER' | 'PANTRY';

// Type pour le statut d'expiration
export type ExpiryStatusType = 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'GOOD';

// Type pour le Nutriscore
export type NutriScore = 'A' | 'B' | 'C' | 'D' | 'E';

// Interface pour un produit
export interface Product {
	id: string;
	name: string;
	brand: string;
	category: string;
	barcode?: string;
	nutriscore?: NutriScore;
	ecoscore?: string;
	novascore?: string;
	imageUrl?: string;
}

// Interface pour un produit avec statut d'expiration
export interface ProductWithExpiryStatus extends Product {
	expiryStatus: ExpiryStatusType;
	quantity: number;
	expiryDate: Date;
	storageLocation: StorageLocation;
}

// Interface pour les statistiques d'inventaire
export interface InventoryStats {
	totalItems: number;
	expiringInWeek: number;
	totalValue: number;
}

// Autres types existants si nécessaires...
