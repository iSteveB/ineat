import { z } from 'zod';

// Type de profil utilisateur
export const ProfileTypeSchema = z.enum(['FAMILY', 'STUDENT', 'SINGLE']);
export type ProfileType = z.infer<typeof ProfileTypeSchema>;

export const RoleTypeSchema = z.enum(['FREE', 'PREMIUM', 'ADMIN']);
export type RoleType = z.infer<typeof RoleTypeSchema>;

// Schéma pour les informations utilisateur
export const UserSchema = z.object({
	id: z.string(),
	email: z.string().email(),
	firstName: z.string(),
	lastName: z.string(),
	avatarUrl: z.string().optional(),
	profileType: ProfileTypeSchema,
	preferences: z
		.object({
			diet: z
				.enum(['OMNIVORE', 'VEGETARIAN', 'VEGAN', 'PESCETARIAN', 'WITHOUT_PORK'])
				.optional(),
			allergies: z.array(z.string()).optional(),
			dislikedIngredients: z.array(z.string()).optional(),
		})
		.optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
	role: RoleTypeSchema,
});
export type User = z.infer<typeof UserSchema>;

// Schéma pour les identifiants de connexion
export const LoginCredentialsSchema = z.object({
	email: z.string().email('Adresse email invalide'),
	password: z
		.string()
		.min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});
export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>;

// Schéma de validation pour l'email
export const emailSchema = z.object({
	email: z
		.string()
		.min(1, "L'email est requis")
		.email("Format d'email invalide"),
});
export type Email = z.infer<typeof emailSchema>;

// Schéma pour l'inscription
export const RegisterDataSchema = z.object({
	email: z.string().email('Adresse email invalide'),
	password: z
		.string()
		.min(8, 'Le mot de passe doit contenir au moins 8 caractères')
		.regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
		.regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
		.regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
	firstName: z.string().min(1, 'Le prénom est requis'),
	lastName: z.string().min(1, 'Le nom est requis'),
	profileType: ProfileTypeSchema,
	preferences: z.record(z.unknown()).optional(),
});
export type RegisterData = z.infer<typeof RegisterDataSchema>;

// Schéma pour la réponse d'authentification
export const AuthResponseSchema = z.object({
	user: UserSchema,
	accessToken: z.string(),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// Schéma pour la validation du mot de passe lors de l'inscription
export const RegisterFormSchema = RegisterDataSchema.extend({
	confirmPassword: z
		.string()
		.min(1, 'La confirmation du mot de passe est requise'),
}).refine((data) => data.password === data.confirmPassword, {
	message: 'Les mots de passe ne correspondent pas',
	path: ['confirmPassword'],
});
export type RegisterFormData = z.infer<typeof RegisterFormSchema>;

// Schéma pour les erreurs API
export const ApiErrorSchema = z.object({
	status: z.number().int().positive(),
	message: z.string().min(1),
	details: z.record(z.unknown()).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
