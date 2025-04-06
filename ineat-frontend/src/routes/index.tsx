import { createFileRoute, redirect } from '@tanstack/react-router';
import { useAuthStore } from '../stores/authStore';

// Définie le type du routerContext
interface RouterContext {
  authStore: ReturnType<typeof useAuthStore.getState>;
}

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    const authStore = (context as RouterContext).authStore;
    
    console.log('authStore.isAuthenticated', authStore.isAuthenticated);
    console.log('authStore.user', authStore.user);
    // Sinon, rediriger vers la page de connexion
    throw redirect({ to: '/login' });
  },
});