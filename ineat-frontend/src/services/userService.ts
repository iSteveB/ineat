import { apiClient } from '@/lib/api-client';
import { ProfileType } from '@/schemas';

// Types pour les requêtes
interface UpdatePersonalInfoRequest {
	firstName: string;
	lastName: string;
	email: string;
	profileType: ProfileType;
}

interface UpdateDietaryRestrictionsRequest {
	allergens?: string[];
	diets?: string[];
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

interface DietaryPreferences {
	allergens: string[];
	diets: string[];
}

interface DietaryRestrictionsResponse {
	success: boolean;
	data: DietaryPreferences;
	message?: string;
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

	/**
	 * Récupère les restrictions alimentaires de l'utilisateur
	 */
	getDietaryRestrictions: async (): Promise<DietaryPreferences> => {
		const response = await apiClient.get<DietaryRestrictionsResponse>(
			'/user/dietary-restrictions'
		);
		return response.data;
	},

	/**
	 * Met à jour les restrictions alimentaires de l'utilisateur
	 */
	updateDietaryRestrictions: async (
		data: UpdateDietaryRestrictionsRequest
	): Promise<DietaryPreferences> => {
		const response = await apiClient.patch<DietaryRestrictionsResponse>(
			'/user/dietary-restrictions',
			data
		);
		return response.data;
	},
};
