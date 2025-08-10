import { createFileRoute, redirect } from '@tanstack/react-router';
import LoginForm from '@/components/auth/LoginForm';
import { isAuthenticated } from '@/utils/auth';

export const Route = createFileRoute('/_auth/login')({
  beforeLoad: async () => {
    const userIsAuthenticated = await isAuthenticated();
    
    if (userIsAuthenticated) {
      throw redirect({ to: '/app' });
    }
    
    return null;
  },
  component: LoginForm,
});