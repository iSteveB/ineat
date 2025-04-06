import { createFileRoute, redirect } from '@tanstack/react-router';
import ForgotPasswordForm from '../../components/auth/ForgotPasswordForm';
import { isAuthenticated } from '@/utils/auth';

export const Route = createFileRoute('/_auth/forgot-password')({
  beforeLoad: async () => {
    // Vérifier l'authentification la fonction utilitaire
    const userIsAuthenticated = await isAuthenticated();
    
    if (userIsAuthenticated) {
      throw redirect({ to: '/app' });
    }
    
    return null;
  },
  component: ForgotPasswordPage,
});

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}