import { z } from 'zod';

// ===== ENUMS DE BASE =====

// Types de profil utilisateur
export const ProfileTypeSchema = z.enum(['FAMILY', 'STUDENT', 'SINGLE']);
export type ProfileType = z.infer<typeof ProfileTypeSchema>;

// Types d'abonnement
export const SubscriptionSchema = z.enum(['FREE', 'PREMIUM', 'ADMIN']);
export type Subscription = z.infer<typeof SubscriptionSchema>;

// Types d'unité de mesure
export const UnitTypeSchema = z.enum(['KG', 'G', 'L', 'ML', 'UNIT']);
export type UnitType = z.infer<typeof UnitTypeSchema>;

// Nutriscore (A = meilleur, E = moins bon)
export const NutriScoreSchema = z.enum(['A', 'B', 'C', 'D', 'E']);
export type NutriScore = z.infer<typeof NutriScoreSchema>;

// Eco-score (A = meilleur impact environnemental, E = pire)
export const EcoscoreSchema = z.enum(['A', 'B', 'C', 'D', 'E']);
export type Ecoscore = z.infer<typeof EcoscoreSchema>;

// Nova score (degré de transformation des aliments)
export const NovascoreSchema = z.enum([
	'GROUP_1',
	'GROUP_2',
	'GROUP_3',
	'GROUP_4',
]);
export type Novascore = z.infer<typeof NovascoreSchema>;

// Statut d'expiration
export const ExpiryStatusSchema = z.enum([
	'GOOD',
	'WARNING',
	'CRITICAL',
	'EXPIRED',
	'UNKNOWN',
]);
export type ExpiryStatus = z.infer<typeof ExpiryStatusSchema>;

// Difficultés de recettes
export const RecipeDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);
export type RecipeDifficulty = z.infer<typeof RecipeDifficultySchema>;

// Types de notifications
export const NotificationTypeSchema = z.enum(['EXPIRY', 'BUDGET', 'SYSTEM']);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

// Types de régimes alimentaires
export const DietTypeSchema = z.enum([
	'OMNIVORE',
	'VEGETARIAN',
	'VEGAN',
	'PESCETARIAN',
	'WITHOUT_PORK',
]);
export type DietType = z.infer<typeof DietTypeSchema>;

// ===== SCHÉMAS DE BASE RÉUTILISABLES =====

// UUID valide
export const UuidSchema = z.string().uuid('UUID invalide');

// Email valide
export const EmailSchema = z.string().email("Format d'email invalide");

// Date au format ISO string
export const DateStringSchema = z.string().datetime('Format de date invalide');

// Date au format YYYY-MM-DD
export const DateInputSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)');

// Mot de passe sécurisé
export const PasswordSchema = z
	.string()
	.min(8, 'Le mot de passe doit contenir au moins 8 caractères')
	.max(100, 'Le mot de passe est trop long')
	.regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
	.regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
	.regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre');

// Prix (nombre positif avec maximum raisonnable)
export const PriceSchema = z.coerce
	.number()
	.min(0, 'Le prix ne peut pas être négatif')
	.max(10000, 'Le prix semble trop élevé');

// Quantité (nombre positif)
export const QuantitySchema = z.coerce
	.number()
	.min(0.001, 'La quantité doit être supérieure à 0')
	.max(100000, 'La quantité semble trop importante');

// Texte court (noms, titres)
export const ShortTextSchema = z
	.string()
	.min(1, 'Ce champ est obligatoire')
	.max(100, 'Le texte ne peut pas dépasser 100 caractères')
	.transform((val) => val.trim());

// Texte moyen (descriptions)
export const MediumTextSchema = z
	.string()
	.max(500, 'Le texte ne peut pas dépasser 500 caractères')
	.transform((val) => val.trim());

// Texte long (instructions, notes)
export const LongTextSchema = z
	.string()
	.max(2000, 'Le texte ne peut pas dépasser 2000 caractères')
	.transform((val) => val.trim());

// ===== UTILITAIRES =====

/**
 * Calcule le statut d'expiration basé sur la date de péremption
 */
export const calculateExpiryStatus = (
	expiryDate?: Date | string | null
): ExpiryStatus => {
	if (!expiryDate) return 'UNKNOWN';

	const expiry =
		typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
	const today = new Date();
	const diffInMs = expiry.getTime() - today.getTime();
	const daysRemaining = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

	if (daysRemaining < 0) return 'EXPIRED';
	if (daysRemaining <= 2) return 'CRITICAL';
	if (daysRemaining <= 5) return 'WARNING';
	return 'GOOD';
};

/**
 * Convertit un NutriScore en valeur numérique (A=5, B=4, C=3, D=2, E=1)
 */
export const nutriscoreToNumber = (score: NutriScore): number => {
	const mapping = { A: 5, B: 4, C: 3, D: 2, E: 1 };
	return mapping[score];
};

/**
 * Convertit une valeur numérique en NutriScore
 */
export const numberToNutriScore = (value: number): NutriScore => {
	if (value >= 4.5) return 'A';
	if (value >= 3.5) return 'B';
	if (value >= 2.5) return 'C';
	if (value >= 1.5) return 'D';
	return 'E';
};
