import { ExpiryStatus } from '@/schemas';

/**
 * Calcule le statut d'expiration d'un produit
 * @param expiryDate - Date d'expiration au format string ISO ou null
 * @returns Le statut d'expiration
 */
export const calculateExpiryStatus = (
	expiryDate: string | null | undefined
): ExpiryStatus => {
	if (!expiryDate) return 'UNKNOWN';

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const expiry = new Date(expiryDate);
	if (Number.isNaN(expiry.getTime())) return 'UNKNOWN';

	expiry.setHours(0, 0, 0, 0);

	const diffTime = expiry.getTime() - today.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays < 0) return 'EXPIRED';
	if (diffDays <= 2) return 'CRITICAL';
	if (diffDays <= 5) return 'WARNING';
	return 'GOOD';
};

/**
 * Formate une date en format relatif compact.
 * @param date - Date à formater
 * @returns Chaîne formatée (ex: "J-3", "Dans 2 mois", "Expiré")
 */
export const formatRelativeDate = (date: string | null | undefined): string => {
	if (!date) return 'Pas de date';

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const targetDate = new Date(date);
	if (Number.isNaN(targetDate.getTime())) return 'Pas de date';

	targetDate.setHours(0, 0, 0, 0);

	const diffTime = targetDate.getTime() - today.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays < 0) {
		return 'Expiré';
	} else if (diffDays === 0) {
		return 'J-0';
	} else if (diffDays === 1) {
		return 'J-1';
	} else if (diffDays > 365) {
		const years = Math.max(1, Math.round(diffDays / 365.25));
		return years === 1 ? 'Dans 1 an' : `Dans ${years} ans`;
	} else if (diffDays > 30) {
		const months = Math.max(1, Math.round(diffDays / 30.44));
		return months === 1 ? 'Dans 1 mois' : `Dans ${months} mois`;
	} else {
		return `J-${diffDays}`;
	}
};

/**
 * Formate une date au format français
 * @param date - Date à formater
 * @returns Date formatée (ex: "25/12/2024")
 */
export const formatDate = (date: string | Date): string => {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	return new Intl.DateTimeFormat('fr-FR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	}).format(dateObj);
};

/**
 * Obtient la couleur Tailwind associée au statut d'expiration
 * @param status - Statut d'expiration
 * @returns Classe CSS Tailwind pour la couleur
 */
export const getExpiryStatusColor = (status: ExpiryStatus): string => {
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
			return 'text-neutral-200';
		default:
			return 'text-neutral-200';
	}
};

/**
 * Obtient la couleur de fond Tailwind associée au statut d'expiration
 * @param status - Statut d'expiration
 * @returns Classe CSS Tailwind pour la couleur de fond
 */
export const getExpiryStatusBgColor = (status: ExpiryStatus): string => {
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
			return 'bg-neutral-100';
		default:
			return 'bg-neutral-100';
	}
};

/**
 * Génère une date relative à aujourd'hui
 * @param days - Nombre de jours à ajouter (négatif pour soustraire)
 * @returns Date correspondante
 */
export const daysFromNow = (days: number): Date => {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return date;
};

/**
 * Vérifie si une date est dans le passé
 * @param date - Date à vérifier
 * @returns true si la date est passée
 */
export const isDateInPast = (date: string | Date): boolean => {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	dateObj.setHours(0, 0, 0, 0);
	return dateObj < today;
};
