import { ExpiryStatus, ExpiryStatusType, NutriScore } from '../types';

// Formater la date au format français
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

// Formater la date en format relatif (aujourd'hui, demain, dans X jours)
export const formatRelativeDate = (date: Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return `Expiré`;
  } else if (diffDays === 0) {
    return 'J-0';
  } else if (diffDays === 1) {
    return 'J-1';
  } else {
    return `J-${diffDays}`;
  }
};

// Obtenir la couleur associée au Nutriscore
export const getNutriscoreColor = (score : NutriScore): string => {
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

// Formater un prix en euros
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(price);
};

// Calculer le pourcentage de budget utilisé
export const calculateBudgetPercentage = (spent: number, total: number): number => {
  return Math.min(Math.round((spent / total) * 100), 100);
};

// Obtenir la classe de couleur pour le budget en fonction du pourcentage utilisé
export const getBudgetColorClass = (percentage: number): string => {
  if (percentage < 65) return 'text-success-50';
  if (percentage < 80) return 'text-warning-50';
  if (percentage < 90) return 'text-error-50';
  return 'text-error-100';
};

// Convertir un Nutriscore en valeur numérique
export const nutriscoreToNumber = (score: NutriScore): number => {
  const mapping = {
    'A': 5,
    'B': 4,
    'C': 3,
    'D': 2,
    'E': 1
  };
  return score ? mapping[score] : 0;
};

// Convertir une valeur numérique en Nutriscore
export const numberToNutriscore = (value: number): NutriScore => {
  if (value >= 4.5) return 'A';
  if (value >= 3.5) return 'B';
  if (value >= 2.5) return 'C';
  if (value >= 1.5) return 'D';
  return 'E';
};

// Fonction utilitaire pour générer des dates relatives à aujourd'hui
export const daysFromNow = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

// Fonction pour calculer le statut d'expiration
export const calculateExpiryStatus = (
  expiryDate: Date
): ExpiryStatusType => {
  const today = new Date();
  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return ExpiryStatus.EXPIRED;
  if (diffDays <= 2) return ExpiryStatus.CRITICAL;
  if (diffDays <= 5) return ExpiryStatus.WARNING;
  return ExpiryStatus.GOOD;
};

// Obtenir la couleur associée au statut d'expiration
export const getExpiryStatusColor = (status: ExpiryStatusType): string => {
  switch (status) {
    case ExpiryStatus.EXPIRED:
      return 'bg-error-100';
    case ExpiryStatus.CRITICAL:
      return 'bg-error-50';
    case ExpiryStatus.WARNING:
      return 'bg-warning-50';
    case ExpiryStatus.GOOD:
      return 'bg-success-50';
    default:
      return 'bg-neutral-200';
  }
};

// Fonction utilitaire combinant calculateExpiryStatus et getExpiryStatusColor
// pour obtenir directement la couleur à partir d'une date
export const getExpiryColor = (date: Date): string => {
  const status = calculateExpiryStatus(date);
  return getExpiryStatusColor(status);
};