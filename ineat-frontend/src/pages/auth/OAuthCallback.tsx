import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import  Spinner from '@/components/ui/spinner';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate, useSearch } from '@tanstack/react-router';

interface OAuthCallbackParams {
  token?: string;
}

const OAuthCallback = () => {
  const [error, setError] = useState<string | null>(null);
  const { handleOAuthCallback, getProfile } = useAuthStore();
  const navigate = useNavigate();
  
  const search = useSearch({
    from: '__root__'
  }) as OAuthCallbackParams;
  
  const token = search.token;

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Vérifier si le token est présent
        if (!token) {
          setError('Token manquant dans la réponse OAuth');
          return;
        }

        // Traiter le callback en utilisant le store Zustand
        handleOAuthCallback(token);
        
        // Récupérer les informations du profil de l'utilisateur
        await getProfile();
        
        // Rediriger vers l'application
        navigate({ to: '/app' });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de l\'authentification OAuth');
      }
    };

    processCallback();
  }, [token, handleOAuthCallback, getProfile, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {error ? (
        <Alert variant="error" className="w-full max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <Spinner size="lg" />
          <p className="text-lg text-center">Authentification en cours...</p>
        </div>
      )}
    </div>
  );
}

export default OAuthCallback;