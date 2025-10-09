import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { ProfileType } from '@/schemas';

interface UpdateProfileData {
  firstName: string;
  lastName: string;
  email: string;
  profileType: ProfileType;
}

interface UseUpdateProfileReturn {
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
  reset: () => void;
}

/**
 * Hook personnalisé pour mettre à jour les informations personnelles de l'utilisateur
 * 
 * @example
 * const { updateProfile, isLoading, error, isSuccess } = useUpdateProfile();
 * 
 * const handleSubmit = async () => {
 *   try {
 *     await updateProfile({
 *       firstName: 'John',
 *       lastName: 'Doe',
 *       email: 'john@example.com',
 *       profileType: 'SINGLE'
 *     });
 *     // Success!
 *   } catch (err) {
 *     // Error handling
 *   }
 * };
 */
export const useUpdateProfile = (): UseUpdateProfileReturn => {
  const updatePersonalInfo = useAuthStore((state) => state.updatePersonalInfo);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const updateProfile = async (data: UpdateProfileData): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);

      await updatePersonalInfo(data);

      setIsSuccess(true);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Une erreur est survenue lors de la mise à jour du profil';
      
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setIsSuccess(false);
  };

  return {
    updateProfile,
    isLoading,
    error,
    isSuccess,
    reset,
  };
};