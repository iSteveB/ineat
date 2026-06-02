import { describe, expect, it } from 'vitest';
import {
	getBetterAuthErrorMessage,
	normalizeAuthEmail,
} from './authService';

describe('getBetterAuthErrorMessage', () => {
	const fallback = 'Connexion impossible. Veuillez réessayer.';

	it('traduit les identifiants invalides avec un message public', () => {
		expect(
			getBetterAuthErrorMessage(
				{
					code: 'INVALID_EMAIL_OR_PASSWORD',
					message: 'Invalid email or password',
				},
				fallback,
				{
					INVALID_EMAIL_OR_PASSWORD: 'Identifiants incorrects',
				}
			)
		).toBe('Identifiants incorrects');
	});

	it('masque les erreurs techniques renvoyées par le serveur', () => {
		expect(
			getBetterAuthErrorMessage(
				{
					message: 'Cannot POST /api/auth/sign-in/email',
				},
				fallback
			)
		).toBe(fallback);
	});
});

describe('normalizeAuthEmail', () => {
	it("normalise la casse et les espaces avant l'authentification", () => {
		expect(normalizeAuthEmail('  UsER@Example.COM ')).toBe(
			'user@example.com'
		);
	});
});
