import { createFileRoute } from '@tanstack/react-router';
import OAuthCallback from '@/pages/auth/OAuthCallback';

export const Route = createFileRoute('/_auth/callback')({
  component: OAuthCallback,
});

