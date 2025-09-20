// ===== IMPORTS SCHÉMAS ZOD =====
import {
	NutriScore,
	ExpiryStatus,
	calculateExpiryStatus,
} from '@/schemas';

// ===== FORMATAGE DES DATES =====

/**
 * Formate la date au format français (DD/MM/YYYY)
 */
export const formatDate = (date: Date | string): string => {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	return new Intl.DateTimeFormat('fr-FR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	}).format(dateObj);
};

/**
 * Formate la date en format relatif (J-0, J-1, J-X, mois, années, Expiré)
 */
export const formatRelativeDate = (date: Date | string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = typeof date === 'string' ? new Date(date) : new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Gestion des dates passées (expirées)
  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    
    if (absDays >= 365) {
      const years = Math.floor(absDays / 365);
      return years === 1 ? 'Expiré il y a 1 an' : `Expiré il y a ${years} ans`;
    } else if (absDays >= 31) {
      const months = Math.floor(absDays / 31);
      return months === 1 ? 'Expiré il y a 1 mois' : `Expiré il y a ${months} mois`;
    } else if (absDays === 1) {
      return 'Expiré hier';
    } else {
      return `Expiré il y a ${absDays} jours`;
    }
  }
  
  // Gestion des dates futures
  if (diffDays === 0) {
    return "Expire aujourd'hui";
  } else if (diffDays === 1) {
    return 'Expire demain';
  } else if (diffDays >= 365) {
    const years = Math.floor(diffDays / 365);
    return years === 1 ? 'Expire dans 1 an' : `Expire dans ${years} ans`;
  } else if (diffDays >= 31) {
    const months = Math.floor(diffDays / 31);
    return months === 1 ? 'Expire dans 1 mois' : `Expire dans ${months} mois`;
  } else {
    return `Expire dans ${diffDays} jours`;
  }
};

/**
 * Formate une date en format court pour l'affichage (J-X)
 */
export const formatShortRelativeDate = (date: Date | string): string => {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const targetDate =
		typeof date === 'string' ? new Date(date) : new Date(date);
	targetDate.setHours(0, 0, 0, 0);

	const diffTime = targetDate.getTime() - today.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays < 0) {
		return 'Expiré';
	} else if (diffDays === 0) {
		return 'J-0';
	} else if (diffDays === 1) {
		return 'J-1';
	} else {
		return `J-${diffDays}`;
	}
};

// ===== FORMATAGE DES PRIX =====

/**
 * Formate un prix en euros avec la devise française
 */
export const formatPrice = (price: number): string => {
	return new Intl.NumberFormat('fr-FR', {
		style: 'currency',
		currency: 'EUR',
	}).format(price);
};

/**
 * Formate un prix sans symbole de devise (pour les inputs)
 */
export const formatPriceValue = (price: number): string => {
	return new Intl.NumberFormat('fr-FR', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(price);
};

// ===== UTILITAIRES BUDGET =====

/**
 * Calcule le pourcentage de budget utilisé
 */
export const calculateBudgetPercentage = (
	spent: number,
	total: number
): number => {
	if (total <= 0) return 0;
	return Math.min(Math.round((spent / total) * 100), 100);
};

/**
 * Obtient la classe de couleur pour le budget selon le pourcentage utilisé
 */
export const getBudgetColorClass = (percentage: number): string => {
	if (percentage < 65) return 'text-success-50';
	if (percentage < 80) return 'text-warning-50';
	if (percentage < 90) return 'text-error-50';
	return 'text-error-100';
};

/**
 * Obtient la classe de couleur de fond pour les barres de progression du budget
 */
export const getBudgetBackgroundClass = (percentage: number): string => {
	if (percentage < 65) return 'bg-success-50';
	if (percentage < 80) return 'bg-warning-50';
	if (percentage < 90) return 'bg-error-50';
	return 'bg-error-100';
};

// ===== COULEURS NUTRISCORE =====

/**
 * Obtient la classe de couleur de texte associée au Nutriscore
 */
export const getNutriscoreTextColor = (score: NutriScore): string => {
	switch (score) {
		case 'A':
			return 'text-nutriscore-a';
		case 'B':
			return 'text-nutriscore-b';
		case 'C':
			return 'text-nutriscore-c';
		case 'D':
			return 'text-nutriscore-d';
		case 'E':
			return 'text-nutriscore-e';
		default:
			return 'text-neutral-300';
	}
};

/**
 * Obtient la classe de couleur de fond associée au Nutriscore
 */
export const getNutriscoreBackgroundColor = (score: NutriScore): string => {
	switch (score) {
		case 'A':
			return 'bg-nutriscore-a';
		case 'B':
			return 'bg-nutriscore-b';
		case 'C':
			return 'bg-nutriscore-c';
		case 'D':
			return 'bg-nutriscore-d';
		case 'E':
			return 'bg-nutriscore-e';
		default:
			return 'bg-neutral-200';
	}
};

// ===== COULEURS STATUT D'EXPIRATION =====

/**
 * Obtient la classe de couleur de fond associée au statut d'expiration
 */
export const getExpiryStatusBackgroundColor = (
	status: ExpiryStatus
): string => {
	switch (status) {
		case 'EXPIRED':
			return 'bg-error-100';
		case 'CRITICAL':
			return 'bg-error-50';
		case 'WARNING':
			return 'bg-warning-50';
		case 'GOOD':
			return 'bg-success-50';
		case 'UNKNOWN':
		default:
			return 'bg-neutral-200';
	}
};

/**
 * Obtient la classe de couleur de texte associée au statut d'expiration
 */
export const getExpiryStatusTextColor = (status: ExpiryStatus): string => {
	switch (status) {
		case 'EXPIRED':
			return 'text-error-100';
		case 'CRITICAL':
			return 'text-error-50';
		case 'WARNING':
			return 'text-warning-50';
		case 'GOOD':
			return 'text-success-50';
		case 'UNKNOWN':
		default:
			return 'text-neutral-200';
	}
};

/**
 * Fonction utilitaire combinant calculateExpiryStatus et getExpiryStatusBackgroundColor
 * pour obtenir directement la couleur de fond à partir d'une date
 */
export const getExpiryBackgroundColor = (
	date: Date | string | null | undefined
): string => {
	const status = calculateExpiryStatus(date);
	return getExpiryStatusBackgroundColor(status);
};

/**
 * Fonction utilitaire pour obtenir directement la couleur de texte à partir d'une date
 */
export const getExpiryTextColor = (
	date: Date | string | null | undefined
): string => {
	const status = calculateExpiryStatus(date);
	return getExpiryStatusTextColor(status);
};

// ===== UTILITAIRES DE DATES =====

/**
 * Génère une date relative à aujourd'hui (+ ou - X jours)
 */
export const daysFromNow = (days: number): Date => {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return date;
};

/**
 * Formate une date pour un input de type date (YYYY-MM-DD)
 */
export const formatDateForInput = (date: Date | string): string => {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	return dateObj.toISOString().split('T')[0];
};

/**
 * Obtient la date d'aujourd'hui au format input
 */
export const getTodayForInput = (): string => {
	return formatDateForInput(new Date());
};

// ===== UTILITAIRES DE VALIDATION =====

/**
 * Vérifie si une date est dans le passé, présent ou futur
 */
export const isFutureDate = (date: Date | string): boolean => {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	dateObj.setHours(0, 0, 0, 0);
	return dateObj > today;
};

export const isPastDate = (date: Date | string): boolean => {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	dateObj.setHours(0, 0, 0, 0);
	return dateObj < today;
};

export const isToday = (date: Date | string): boolean => {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	const today = new Date();
	return (
		dateObj.getDate() === today.getDate() &&
		dateObj.getMonth() === today.getMonth() &&
		dateObj.getFullYear() === today.getFullYear()
	);
};

// ===== UTILITAIRES DE FORMATAGE DE QUANTITÉS =====

/**
 * Formate une quantité avec son unité
 */
export const formatQuantity = (quantity: number, unit: string): string => {
	// Formatage intelligent selon l'unité
	const formattedQuantity =
		quantity % 1 === 0
			? quantity.toString()
			: quantity.toFixed(2).replace(/\.?0+$/, '');

	// Gestion des unités au pluriel
	const formatUnit = (unit: string, qty: number): string => {
		switch (unit.toLowerCase()) {
			case 'kg':
				return qty > 1 ? 'kg' : 'kg';
			case 'g':
				return qty > 1 ? 'g' : 'g';
			case 'l':
				return qty > 1 ? 'L' : 'L';
			case 'ml':
				return qty > 1 ? 'mL' : 'mL';
			case 'unit':
				return qty > 1 ? 'unités' : 'unité';
			default:
				return unit;
		}
	};

	return `${formattedQuantity} ${formatUnit(unit, quantity)}`;
};

// Re-export des fonctions utiles des schémas Zod pour éviter les imports multiples
export {
	calculateExpiryStatus,
	nutriscoreToNumber,
	numberToNutriScore,
} from '@/schemas';

// ===== CONSTANTES =====

export const UI_CONSTANTS = {
	// Seuils de budget pour les couleurs
	BUDGET_THRESHOLDS: {
		GOOD: 65,
		WARNING: 80,
		CRITICAL: 90,
	},

	// Formats de date
	DATE_FORMATS: {
		FR: 'DD/MM/YYYY',
		INPUT: 'YYYY-MM-DD',
		ISO: 'YYYY-MM-DDTHH:mm:ss.sssZ',
	},

	// Couleurs par défaut
	DEFAULT_COLORS: {
		TEXT: 'text-neutral-300',
		BACKGROUND: 'bg-neutral-200',
	},
} as const;

export const getInitials = (firstName: string, lastName: string) => {
	return `${firstName[0]}${lastName[0]}`.toUpperCase();
};

export const getCurrentMonthTitle = (): string => {
	const now = new Date();
	const monthIndex = now.getMonth();

	const months = [
		'janvier',
		'février',
		'mars',
		'avril',
		'mai',
		'juin',
		'juillet',
		'août',
		'septembre',
		'octobre',
		'novembre',
		'décembre',
	];

	const vowelMonths = ['janvier', 'avril', 'août', 'octobre'];
	const currentMonth = months[monthIndex];
	const determiner = vowelMonths.includes(currentMonth) ? "d'" : 'de ';

	return `Budget ${determiner}${currentMonth}`;
};