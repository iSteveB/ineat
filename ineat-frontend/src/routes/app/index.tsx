import { createFileRoute, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import DashboardPage from '@/pages/dashboard/DashboardPage';

export const Route = createFileRoute('/app/')({
	beforeLoad: () => {
		const user = useAuthStore.getState().user;
		if (user && !user.profileOnboardingCompletedAt) {
			throw redirect({ to: '/app/onboarding' });
		}
	},
	component: DashboardPage,
});

