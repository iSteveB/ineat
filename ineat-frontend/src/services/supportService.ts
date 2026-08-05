import { apiClient } from '@/lib/api-client';

export const SUPPORT_SUBJECTS = {
	ACCOUNT: 'Mon compte',
	TECHNICAL_ISSUE: 'Problème technique',
	ORDER_OR_SUBSCRIPTION: 'Commande ou abonnement',
	FEATURE_REQUEST: 'Proposer une fonctionnalité',
	OTHER: 'Autre',
} as const;

export type SupportSubject = keyof typeof SUPPORT_SUBJECTS;

type SendSupportMessageResponse = {
	success: boolean;
	message: string;
};

export const supportService = {
	sendMessage(subject: SupportSubject, message: string) {
		return apiClient.post<SendSupportMessageResponse>('/support/messages', {
			subject,
			message,
		});
	},
};
