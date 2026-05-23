import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '@/lib/api-client';
import { getUserFacingErrorMessage } from './errorMessages';

describe('getUserFacingErrorMessage', () => {
	it('retourne le message public des ApiRequestError', () => {
		const error = new ApiRequestError(
			'Impossible de mettre à jour le profil.',
			500,
			{
				rawMessage: 'Invalid api_key 738474456436988',
			}
		);

		expect(
			getUserFacingErrorMessage(error, 'Erreur fallback')
		).toBe('Impossible de mettre à jour le profil.');
	});

	it('masque les erreurs sensibles génériques', () => {
		const error = new Error('Cloudinary Invalid api_key 738474456436988');

		expect(
			getUserFacingErrorMessage(
				error,
				'Impossible de mettre à jour la photo de profil.'
			)
		).toBe('Impossible de mettre à jour la photo de profil.');
	});

	it('préserve les messages locaux non sensibles', () => {
		const error = new Error('Aucun produit à ajouter à l’inventaire');

		expect(
			getUserFacingErrorMessage(error, 'Erreur fallback')
		).toBe('Aucun produit à ajouter à l’inventaire');
	});
});
