import { createFileRoute } from '@tanstack/react-router';
import SubscriptionPage from '@/pages/subscription/SubscriptionPage';

export const Route = createFileRoute('/app/subscription/')({
  component: SubscriptionPage,
})
