import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import EmailVerificationPending from '@/components/auth/EmailVerificationPending';

const searchSchema = z.object({
	email: z.string().email().catch(''),
});

export const Route = createFileRoute('/_auth/verify-email-pending')({
	validateSearch: searchSchema,
	beforeLoad: ({ search }) => {
		if (!search.email) {
			throw redirect({ to: '/register' });
		}
	},
	component: VerifyEmailPendingRoute,
});

function VerifyEmailPendingRoute() {
	const { email } = Route.useSearch();
	return <EmailVerificationPending email={email} />;
}
