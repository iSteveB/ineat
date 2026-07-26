import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import EmailVerificationResult from '@/components/auth/EmailVerificationResult';

const searchSchema = z.object({
	error: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/_auth/verify-email')({
	validateSearch: searchSchema,
	component: VerifyEmailRoute,
});

function VerifyEmailRoute() {
	const { error } = Route.useSearch();
	return <EmailVerificationResult error={error} />;
}
