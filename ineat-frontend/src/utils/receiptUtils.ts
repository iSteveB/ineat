/**
 * Utilitaires pour la gestion des tickets de caisse
 */

// ===== TYPES =====

/**
 * Source préférée pour la capture
 */
export type CaptureSource = 'camera' | 'file' | 'both';

// ===== CONSTANTES =====

/**
 * Formats d'image acceptés
 */
export const ACCEPTED_IMAGE_FORMATS =
	'image/jpeg,image/jpg,image/png,image/heic,image/heif';

/**
 * Extensions acceptées
 */
export const ACCEPTED_IMAGE_EXTENSIONS = [
	'.jpg',
	'.jpeg',
	'.png',
	'.heic',
	'.heif',
];

/**
 * Taille maximale en octets (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Taille maximale formatée pour l'affichage
 */
export const MAX_FILE_SIZE_MB = 10;

// ===== DÉTECTION DE DEVICE =====

/**
 * Vérifie si le device supporte la caméra
 */
export function isCameraSupported(): boolean {
	return (
		typeof navigator !== 'undefined' &&
		'mediaDevices' in navigator &&
		'getUserMedia' in navigator.mediaDevices
	);
}

/**
 * Vérifie si on est sur mobile
 */
export function isMobileDevice(): boolean {
	if (typeof window === 'undefined') return false;

	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
		navigator.userAgent
	);
}

/**
 * Détermine la source préférée en fonction du device
 */
export function getPreferredCaptureSource(): CaptureSource {
	if (isMobileDevice() && isCameraSupported()) {
		return 'camera';
	}
	return 'file';
}

// ===== VALIDATION DE FICHIERS =====

/**
 * Valide un fichier image pour l'upload
 */
export function validateImageFile(file: File): string | null {
	// Vérifier le type
	if (!file.type.startsWith('image/')) {
		return 'Le fichier doit être une image';
	}

	// Vérifier la taille
	if (file.size > MAX_FILE_SIZE) {
		return `L'image ne doit pas dépasser ${MAX_FILE_SIZE_MB}MB`;
	}

	return null;
}

/**
 * Vérifie si un fichier est une image valide
 */
export function isValidImageFile(file: File): boolean {
	return validateImageFile(file) === null;
}

// ===== FORMATAGE =====

/**
 * Formate une taille de fichier en format lisible
 * @example formatFileSize(1024) => "1 KB"
 * @example formatFileSize(1048576) => "1 MB"
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Formate un pourcentage de progression
 * @example formatProgress(0.756) => "75.6%"
 */
export function formatProgress(progress: number): string {
	return `${(progress * 100).toFixed(1)}%`;
}

/**
 * Formate le temps restant en secondes
 * @example formatRemainingTime(65) => "1min 5s"
 * @example formatRemainingTime(30) => "30 secondes"
 */
export function formatRemainingTime(
	seconds: number | null | undefined
): string {
	if (!seconds || seconds <= 0) return '';

	if (seconds < 60) {
		return `${Math.round(seconds)} seconde${seconds > 1 ? 's' : ''}`;
	}

	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.round(seconds % 60);

	if (remainingSeconds === 0) {
		return `${minutes} minute${minutes > 1 ? 's' : ''}`;
	}

	return `${minutes}min ${remainingSeconds}s`;
}

/**
 * Formate un montant en euros
 * @example formatAmount(12.5) => "12,50 €"
 */
export function formatAmount(amount?: number | null): string {
	if (!amount && amount !== 0) return 'N/A';
	return new Intl.NumberFormat('fr-FR', {
		style: 'currency',
		currency: 'EUR',
	}).format(amount);
}

/**
 * Formate une date relative
 * @example formatRelativeDate("2024-01-20") => "Il y a 3 jours"
 */
export function formatRelativeDate(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) {
		return "Aujourd'hui";
	} else if (diffDays === 1) {
		return 'Hier';
	} else if (diffDays < 7) {
		return `Il y a ${diffDays} jours`;
	} else {
		return date.toLocaleDateString('fr-FR');
	}
}

// ===== MANIPULATION D'IMAGES =====

/**
 * Crée une URL de prévisualisation pour un fichier
 */
export function createImagePreview(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			resolve(reader.result as string);
		};
		reader.onerror = () => {
			reject(new Error('Erreur lors de la lecture du fichier'));
		};
		reader.readAsDataURL(file);
	});
}

/**
 * Révoque une URL de prévisualisation pour libérer la mémoire
 */
export function revokeImagePreview(url: string): void {
	if (url.startsWith('blob:')) {
		URL.revokeObjectURL(url);
	}
}

/**
 * Compresse une image (basique)
 * Note: Pour une compression avancée, utiliser une bibliothèque dédiée
 */
export function compressImage(
	file: File,
	maxWidth: number = 1920,
	maxHeight: number = 1920,
	quality: number = 0.8
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');

		if (!ctx) {
			reject(new Error('Canvas context non disponible'));
			return;
		}

		img.onload = () => {
			let width = img.width;
			let height = img.height;

			// Calculer les nouvelles dimensions
			if (width > maxWidth || height > maxHeight) {
				const ratio = Math.min(maxWidth / width, maxHeight / height);
				width *= ratio;
				height *= ratio;
			}

			canvas.width = width;
			canvas.height = height;

			// Dessiner l'image redimensionnée
			ctx.drawImage(img, 0, 0, width, height);

			// Convertir en blob
			canvas.toBlob(
				(blob) => {
					if (blob) {
						resolve(blob);
					} else {
						reject(new Error('Erreur lors de la compression'));
					}
				},
				file.type,
				quality
			);
		};

		img.onerror = () => {
			reject(new Error("Erreur lors du chargement de l'image"));
		};

		img.src = URL.createObjectURL(file);
	});
}

// ===== CALCULS =====

/**
 * Calcule le pourcentage de progression basé sur les items validés
 */
export function calculateValidationProgress(
	validatedItems: number,
	totalItems: number
): number {
	if (totalItems === 0) return 0;
	return Math.round((validatedItems / totalItems) * 100);
}

/**
 * Calcule le temps estimé restant basé sur la progression
 */
export function estimateRemainingTime(
	progress: number,
	elapsedTime: number
): number {
	if (progress === 0) return 0;
	const totalEstimatedTime = (elapsedTime / progress) * 100;
	return Math.max(0, totalEstimatedTime - elapsedTime);
}

// ===== VÉRIFICATIONS =====

/**
 * Vérifie si un statut est terminal (traitement terminé)
 */
export function isTerminalStatus(
	status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'VALIDATED'
): boolean {
	return ['COMPLETED', 'FAILED', 'VALIDATED'].includes(status);
}

/**
 * Vérifie si un ticket est prêt pour l'inventaire
 */
export function isReadyForInventory(
	status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'VALIDATED',
	readyForInventory: boolean
): boolean {
	return status === 'VALIDATED' && readyForInventory;
}

// ===== CONFIANCE (CONFIDENCE) =====

/**
 * Seuils de confiance pour les badges
 */
export const CONFIDENCE_THRESHOLDS = {
	HIGH: 0.8,
	MEDIUM: 0.5,
	LOW: 0,
} as const;

/**
 * Calcule le pourcentage de confiance formaté
 * @example formatConfidence(0.856) => "86%"
 */
export function formatConfidence(confidence: number): string {
	return `${Math.round(confidence * 100)}%`;
}

/**
 * Détermine le niveau de confiance
 * @returns 'high' | 'medium' | 'low'
 */
export function getConfidenceLevel(
	confidence: number
): 'high' | 'medium' | 'low' {
	if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'high';
	if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
	return 'low';
}

/**
 * Détermine la couleur du badge de confiance pour shadcn/ui
 */
export function getConfidenceColor(
	confidence: number
): 'default' | 'secondary' | 'destructive' {
	if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'default';
	if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'secondary';
	return 'destructive';
}
