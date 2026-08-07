import { describe, expect, it } from 'vitest';
import { UserSchema } from '@/schemas';
import {
	createEmailSignInPayload,
	getBetterAuthErrorMessage,
	getEmailVerificationCallbackUrl,
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

});

describe('normalizeAuthEmail', () => {
	it("normalise la casse et les espaces avant l'authentification", () => {
		expect(normalizeAuthEmail('  UsER@Example.COM ')).toBe(
			'user@example.com'
		);
	});
});

describe('createEmailSignInPayload', () => {
	it("ne redirige pas une connexion normale vers la page de vérification", () => {
		const payload = createEmailSignInPayload({
			email: ' User@Example.com ',
			password: 'password123',
		});

		expect(payload).toEqual({
			email: 'user@example.com',
			password: 'password123',
			rememberMe: true,
		});
		expect(payload).not.toHaveProperty('callbackURL');
	});
});

describe('getEmailVerificationCallbackUrl', () => {
	it('redirige la vérification vers le frontend courant', () => {
		expect(getEmailVerificationCallbackUrl()).toBe(
			`${window.location.origin}/verify-email`
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
				defaultServings: 4,
				primaryGoal: null,
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

	it('accepte et normalise un ancien profil incomplet', () => {
		const legacyProfile = {
			id: 'BXmlY6a3OKsOF5XhKoDk6duOngptUIVJ',
			email: 'legacy@example.com',
			firstName: '',
			lastName: '',
			defaultServings: '4',
			primaryGoal: null,
			preferences: '{"allergens":["gluten"]}',
			subscription: 'FREE',
			createdAt: '2026-06-02T08:23:54.116Z',
			updatedAt: '2026-06-02T08:23:54.116Z',
		};

		expect(isValidUser(legacyProfile)).toBe(true);
		expect(UserSchema.parse(legacyProfile)).toMatchObject({
			firstName: '',
			lastName: '',
			defaultServings: 4,
			profileOnboardingCompletedAt: null,
			preferences: {
				allergens: ['gluten'],
				diets: [],
			},
		});
	});
});
