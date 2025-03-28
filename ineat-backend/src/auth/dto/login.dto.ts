import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

// Schéma Zod pour la validation
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
