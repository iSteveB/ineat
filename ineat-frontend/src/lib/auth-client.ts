import { createAuthClient } from 'better-auth/react';

const getAuthBaseUrl = () => {
	const apiOrigin = import.meta.env.VITE_API_URL || 'http://localhost:3000';
	return apiOrigin.replace(/\/api\/?$/, '').replace(/\/$/, '');
};

export const authClient = createAuthClient({
	baseURL: getAuthBaseUrl(),
	basePath: '/api/auth',
	fetchOptions: {
		credentials: 'include',
	},
});

export const { signIn, signUp, signOut, useSession } = authClient;
