import { z } from 'zod';
import {
	UuidSchema,
	EmailSchema,
	PasswordSchema,
	ShortTextSchema,
	ProfileTypeSchema,
	SubscriptionSchema,
} from './base';
import {
  DietaryPreferencesSchema,
	UiPreferencesSchema,
	ApiSuccessResponseSchema,
  TimestampsSchema,
} from './common';

// ===== SCHÉMA UTILISATEUR PRINCIPAL =====

export const UserSchema = z
	.object({
		id: UuidSchema,
		email: EmailSchema,
		firstName: ShortTextSchema,
		lastName: ShortTextSchema,
		avatarUrl: z.string().url("URL d'avatar invalide").optional(),
		profileType: ProfileTypeSchema,
		subscription: SubscriptionSchema,
		dietaryPreferences: DietaryPreferencesSchema.optional(),
		uiPreferences: UiPreferencesSchema.optional(),
	})
	.merge(TimestampsSchema);

export type User = z.infer<typeof UserSchema>;

// Version publique de l'utilisateur (sans données sensibles)
export const PublicUserSchema = UserSchema.omit({
	dietaryPreferences: true,
	uiPreferences: true,
});
export type PublicUser = z.infer<typeof PublicUserSchema>;

// ===== SCHÉMAS D'AUTHENTIFICATION =====

// Identifiants de connexion
export const LoginCredentialsSchema = z.object({
	email: EmailSchema,
	password: z.string().min(1, 'Le mot de passe est requis'),
});
export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>;

// Données d'inscription
export const RegisterDataSchema = z.object({
	email: EmailSchema,
	password: PasswordSchema,
	firstName: ShortTextSchema,
	lastName: ShortTextSchema,
	profileType: ProfileTypeSchema,
	dietaryPreferences: DietaryPreferencesSchema.optional(),
});
export type RegisterData = z.infer<typeof RegisterDataSchema>;

// Formulaire d'inscription avec confirmation de mot de passe
export const RegisterFormSchema = RegisterDataSchema.extend({
	confirmPassword: z
		.string()
		.min(1, 'La confirmation du mot de passe est requise'),
}).refine((data) => data.password === data.confirmPassword, {
	message: 'Les mots de passe ne correspondent pas',
	path: ['confirmPassword'],
});
export type RegisterFormData = z.infer<typeof RegisterFormSchema>;

// ===== SCHÉMAS DE RÉPONSES D'AUTHENTIFICATION =====

// Réponse de connexion/inscription réussie
export const AuthResponseSchema = ApiSuccessResponseSchema(
	z.object({
		user: UserSchema,
		accessToken: z.string().optional(), // Optionnel car on utilise des cookies HTTP-only
	})
);
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// Réponse de vérification d'authentification
export const AuthCheckResponseSchema = ApiSuccessResponseSchema(
	z.object({
		isAuthenticated: z.boolean(),
		user: UserSchema.optional(),
	})
);
export type AuthCheckResponse = z.infer<typeof AuthCheckResponseSchema>;

// ===== SCHÉMAS DE RÉCUPÉRATION DE MOT DE PASSE =====

// Demande de récupération de mot de passe
export const ForgotPasswordSchema = z.object({
	email: EmailSchema,
});
export type ForgotPasswordData = z.infer<typeof ForgotPasswordSchema>;

// Réinitialisation de mot de passe
export const ResetPasswordSchema = z
	.object({
		token: z.string().min(1, 'Le token est requis'),
		password: PasswordSchema,
		confirmPassword: z
			.string()
			.min(1, 'La confirmation du mot de passe est requise'),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Les mots de passe ne correspondent pas',
		path: ['confirmPassword'],
	});
export type ResetPasswordData = z.infer<typeof ResetPasswordSchema>;

// ===== SCHÉMAS DE MISE À JOUR DU PROFIL =====

// Mise à jour des informations personnelles
export const UpdateProfileSchema = z.object({
	firstName: ShortTextSchema.optional(),
	lastName: ShortTextSchema.optional(),
	avatarUrl: z.string().url("URL d'avatar invalide").optional(),
	profileType: ProfileTypeSchema.optional(),
});
export type UpdateProfileData = z.infer<typeof UpdateProfileSchema>;

// Mise à jour des préférences alimentaires
export const UpdateDietaryPreferencesSchema =
	DietaryPreferencesSchema.partial();
export type UpdateDietaryPreferencesData = z.infer<
	typeof UpdateDietaryPreferencesSchema
>;

// Mise à jour des préférences d'interface
export const UpdateUiPreferencesSchema = UiPreferencesSchema.partial();
export type UpdateUiPreferencesData = z.infer<typeof UpdateUiPreferencesSchema>;

// ===== SCHÉMAS DE CHANGEMENT DE MOT DE PASSE =====

export const ChangePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
		newPassword: PasswordSchema,
		confirmNewPassword: z
			.string()
			.min(1, 'La confirmation du nouveau mot de passe est requise'),
	})
	.refine((data) => data.newPassword === data.confirmNewPassword, {
		message: 'Les nouveaux mots de passe ne correspondent pas',
		path: ['confirmNewPassword'],
	})
	.refine((data) => data.currentPassword !== data.newPassword, {
		message:
			'Le nouveau mot de passe doit être différent du mot de passe actuel',
		path: ['newPassword'],
	});
export type ChangePasswordData = z.infer<typeof ChangePasswordSchema>;

// ===== SCHÉMAS DE GESTION DE L'ABONNEMENT =====

// Upgrade vers premium
export const UpgradeSubscriptionSchema = z.object({
	plan: z.enum(['PREMIUM']),
	paymentMethodId: z.string().optional(),
});
export type UpgradeSubscriptionData = z.infer<typeof UpgradeSubscriptionSchema>;

// ===== SCHÉMAS D'ONBOARDING =====

// Données d'onboarding après inscription
export const OnboardingDataSchema = z.object({
	dietaryPreferences: DietaryPreferencesSchema,
	uiPreferences: UiPreferencesSchema.partial(),
	hasCompletedTutorial: z.boolean().default(false),
});
export type OnboardingData = z.infer<typeof OnboardingDataSchema>;

// ===== SCHÉMAS DE VALIDATION EMAIL =====

// Validation d'email simple
export const EmailValidationSchema = z.object({
	email: EmailSchema,
});
export type EmailValidationData = z.infer<typeof EmailValidationSchema>;

// ===== SCHÉMAS DE SUPPRESSION DE COMPTE =====

export const DeleteAccountSchema = z.object({
	password: z
		.string()
		.min(1, 'Le mot de passe est requis pour supprimer le compte'),
	confirmDeletion: z.literal(true, {
		errorMap: () => ({
			message: 'Vous devez confirmer la suppression de votre compte',
		}),
	}),
	reason: z.string().optional(),
});
export type DeleteAccountData = z.infer<typeof DeleteAccountSchema>;

// ===== UTILITAIRES =====

/**
 * Vérifie si un utilisateur a un abonnement premium
 */
export const isPremiumUser = (user: User): boolean => {
	return user.subscription === 'PREMIUM' || user.subscription === 'ADMIN';
};

/**
 * Vérifie si un utilisateur est administrateur
 */
export const isAdminUser = (user: User): boolean => {
	return user.subscription === 'ADMIN';
};

/**
 * Obtient le nom complet d'un utilisateur
 */
export const getUserFullName = (user: User): string => {
	return `${user.firstName} ${user.lastName}`.trim();
};

/**
 * Obtient les initiales d'un utilisateur pour l'avatar
 */
export const getUserInitials = (user: User): string => {
	const firstInitial = user.firstName.charAt(0).toUpperCase();
	const lastInitial = user.lastName.charAt(0).toUpperCase();
	return `${firstInitial}${lastInitial}`;
};

/**
 * Vérifie si l'utilisateur a complété son profil
 */
export const hasCompleteProfile = (user: User): boolean => {
	return !!(
		user.firstName &&
		user.lastName &&
		user.email &&
		user.profileType &&
		user.dietaryPreferences
	);
};
