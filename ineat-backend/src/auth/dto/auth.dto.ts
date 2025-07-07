import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

// REGISTER DTOs
export const RegisterSchema = z.object({
  email: z.string().email({ message: 'Adresse email invalide' }),
  password: z
    .string()
    .min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
    .regex(/[A-Z]/, {
      message: 'Le mot de passe doit contenir au moins une majuscule',
    })
    .regex(/[a-z]/, {
      message: 'Le mot de passe doit contenir au moins une minuscule',
    })
    .regex(/[0-9]/, {
      message: 'Le mot de passe doit contenir au moins un chiffre',
    }),
  firstName: z.string().min(1, { message: 'Le prénom est requis' }),
  lastName: z.string().min(1, { message: 'Le nom est requis' }),
  profileType: z.enum(['FAMILY', 'STUDENT', 'SINGLE'], {
    errorMap: () => ({ message: 'Type de profil invalide' }),
  }),
  preferences: z.object({}).passthrough().optional(),
});

// Type pour le DTO généré à partir du schéma Zod
export type RegisterDto = z.infer<typeof RegisterSchema>;

// Fonction de validation
export const validateRegisterDto = (data: unknown): RegisterDto => {
  try {
    return RegisterSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(fromZodError(error).message);
    }
    throw error;
  }
};

export const SafeUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  profileType: z.enum(['FAMILY', 'STUDENT', 'SINGLE']),
  preferences: z.object({}).passthrough().optional(),
});

export type SafeUserDto = z.infer<typeof SafeUserSchema>;


// Login
export const LoginSchema = z.object({
  email: z.string().email({ message: 'Adresse email invalide' }),
  password: z.string().min(1, { message: 'Le mot de passe est requis' }),
});

// Type pour le DTO généré à partir du schéma Zod
export type LoginDto = z.infer<typeof LoginSchema>;

// Fonction de validation
export const validateLoginDto = (data: unknown): LoginDto => {
  try {
    return LoginSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(fromZodError(error).message);
    }
    throw error;
  }
};