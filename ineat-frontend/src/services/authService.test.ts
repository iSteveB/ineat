import { describe, expect, it } from 'vitest';
import {
	getBetterAuthErrorMessage,
	isValidUser,
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
					message: 'Cannot POST /auth/sign-in/email',
				},
				fallback
			)
		).toBe(fallback);
	});

	it("traduit l'inscription avec une adresse déjà utilisée", () => {
		expect(
			getBetterAuthErrorMessage(
				{
					code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
					message: 'User already exists. Use another email.',
				},
				"Impossible de finaliser l'inscription",
				{
					USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
						'Un compte existe déjà avec cette adresse. Connectez-vous.',
				}
			)
		).toBe(
			'Un compte existe déjà avec cette adresse. Connectez-vous.'
		);
	});
});

describe('normalizeAuthEmail', () => {
	it("normalise la casse et les espaces avant l'authentification", () => {
		expect(normalizeAuthEmail('  UsER@Example.COM ')).toBe(
			'user@example.com'
		);
	});
});

describe('isValidUser', () => {
	it("accepte l'identifiant opaque généré par Better Auth", () => {
		expect(
			isValidUser({
				id: 'BXmlY6a3OKsOF5XhKoDk6duOngptUIVJ',
				email: 'user@example.com',
				firstName: 'Steve',
				lastName: 'Basse',
				profileType: 'FAMILY',
				subscription: 'FREE',
				role: 'USER',
				subscriptionPlan: 'FREE',
				subscriptionStatus: 'ACTIVE',
				effectivePlan: 'FREE',
				capabilities: {
					inventoryLimit: 50,
					canUseRecipes: false,
					canGenerateAiRecipes: false,
					aiRecipeGenerationRemaining: 0,
					canImportDrive: false,
					driveImportsRemaining: 0,
					canUseAutomaticBudgetSync: false,
					canAccessAdmin: false,
				},
				createdAt: '2026-06-02T08:23:54.116Z',
				updatedAt: '2026-06-02T08:23:54.116Z',
			})
		).toBe(true);
	});
});
