import { z } from 'zod';

export const LoginCredentialsSchema = z.object({
  email: z
    .string()
    .email('Format d\'email invalide')
    .min(1, 'L\'email est requis'),
  password: z
    .string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
    .max(100, 'Le mot de passe est trop long')
});

export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>;

export const RegisterDataSchema = z.object({
  email: z
    .string()
    .email('Format d\'email invalide')
    .min(1, 'L\'email est requis'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(100, 'Le mot de passe est trop long'),
  firstName: z
    .string()
    .min(1, 'Le prénom est requis')
    .max(50, 'Le prénom est trop long'),
  lastName: z
    .string()
    .min(1, 'Le nom est requis')
    .max(50, 'Le nom est trop long'),
  profileType: z.enum(['FAMILY', 'STUDENT', 'SINGLE'], {
    errorMap: () => ({ message: 'Type de profil invalide' })
  })
});

export type RegisterData = z.infer<typeof RegisterDataSchema>;