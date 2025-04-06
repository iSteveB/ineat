import { createFileRoute, redirect } from '@tanstack/react-router';
import RegisterForm from '@/components/auth/RegisterForm';
import { isAuthenticated } from '@/utils/auth';

export const Route = createFileRoute('/_auth/register')({
  beforeLoad: async () => {
    // Vérifier l'authentification la fonction utilitaire
    const userIsAuthenticated = await isAuthenticated();
    
    if (userIsAuthenticated) {
      throw redirect({ to: '/app' });
    }
    
    return null;
  },
  component: RegisterForm,
});

export default function RegisterPage () {
  return <RegisterForm />;
};