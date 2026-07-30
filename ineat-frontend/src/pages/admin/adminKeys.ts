export const adminKeys = {
	dashboard: ['admin', 'dashboard'] as const,
	usersRoot: ['admin', 'users'] as const,
	users: (query?: unknown) => ['admin', 'users', query] as const,
	user: (userId: string) => ['admin', 'user', userId] as const,
};
