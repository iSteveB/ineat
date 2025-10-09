import { apiClient } from '@/lib/api-client';
import { ProfileType } from '@/schemas';

// Types pour les requêtes
interface UpdatePersonalInfoRequest {
	firstName: string;
	lastName: string;
	email: string;
	profileType: ProfileType;
}

// Types pour les réponses
interface UserResponse {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	profileType: ProfileType;
	avatarUrl?: string;
	createdAt: string;
	updatedAt: string;
}

interface ApiResponse<T> {
	data: T;
	message?: string;
}

export const userService = {
	/**
	 * Met à jour les informations personnelles de l'utilisateur
	 */
	updatePersonalInfo: async (
		data: UpdatePersonalInfoRequest
	): Promise<UserResponse> => {
		const response = await apiClient.patch<ApiResponse<UserResponse>>(
			'/user/profile',
			data
		);
		return response.data;
	},
};
