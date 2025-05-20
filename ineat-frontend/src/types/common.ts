import { z } from 'zod';

export const formatZodError = (error: z.ZodError): string => {
  const errors = error.errors.map((err) => err.message);
  return errors.join('\n');
}

// Statuts d'expiration
export const ExpiryStatus = {
  EXPIRED: 'expired',
  CRITICAL: 'critical', // Moins de 2 jours
  WARNING: 'warning',   // Entre 2 et 5 jours
  GOOD: 'good'          // Plus de 5 jours
} as const;

export type ExpiryStatusType = typeof ExpiryStatus[keyof typeof ExpiryStatus];