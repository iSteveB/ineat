export const adminKeys = {
	dashboard: ['admin', 'dashboard'] as const,
	dashboardQuery: (query: unknown) => ['admin', 'dashboard', query] as const,
	usersRoot: ['admin', 'users'] as const,
	users: (query?: unknown) => ['admin', 'users', query] as const,
	user: (userId: string) => ['admin', 'user', userId] as const,
	promotions: ['admin', 'promotions'] as const,
	premiumUsers: ['admin', 'users', 'premium-subscriptions'] as const,
	queues: ['admin', 'queues'] as const,
	audit: (query?: unknown) => ['admin', 'audit', query] as const,
};
