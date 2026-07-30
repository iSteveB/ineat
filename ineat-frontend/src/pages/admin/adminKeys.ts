export const adminKeys = {
	dashboard: ['admin', 'dashboard'] as const,
	dashboardQuery: (query: unknown) => ['admin', 'dashboard', query] as const,
	usersRoot: ['admin', 'users'] as const,
	users: (query?: unknown) => ['admin', 'users', query] as const,
	user: (userId: string) => ['admin', 'user', userId] as const,
};
