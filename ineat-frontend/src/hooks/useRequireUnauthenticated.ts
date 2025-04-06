import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/authService';

export const useRequireUnauthenticated = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    let isMounted = true;

    const checkAuthentication = async () => {
      // Si déjà authentifié dans le state, rediriger immédiatement
      if (isAuthenticated && user) {
        navigate({ to: '/app', replace: true });
        return;
      }

      // Sinon, vérifier auprès du serveur
      try {
        const fetchedUser = await authService.getProfile();
        
        // Si la requête réussit et que le composant est toujours monté
        if (isMounted) {
          // Mettre à jour le store
          useAuthStore.setState({
            user: fetchedUser,
            isAuthenticated: true
          });
          
          // Rediriger vers l'application
          navigate({ to: '/app', replace: true });
        }
      } catch {
        // Si l'erreur est attendue (utilisateur non authentifié), ne rien faire
        // C'est le comportement attendu pour les pages d'authentification
      }
    };

    checkAuthentication();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user, navigate]);
};