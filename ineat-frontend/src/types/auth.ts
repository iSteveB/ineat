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
	profileType: ProfileTypeSchema,
	preferences: z.record(z.unknown()).optional(),
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

// Fonction pour formater les erreurs Zod
export function formatZodError(error: z.ZodError): string {
	const errors = error.errors.map((err) => err.message);
	return errors.join('\n');
}

export const ApiErrorSchema = z.object({
  // Code de statut HTTP
  status: z.number().int().positive(),
  
  // Message d'erreur
  message: z.string().min(1),
  
  // Détails supplémentaires (optionnels)
  details: z.record(z.unknown()).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;