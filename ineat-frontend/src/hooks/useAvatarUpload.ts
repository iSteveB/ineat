import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

/**
 * Paramètres d'upload retournés par l'API
 */
interface UploadParams {
	cloudName: string;
	uploadPreset: string;
	folder: string;
}

/**
 * Réponse de Cloudinary après upload
 */
interface CloudinaryUploadResponse {
	secure_url: string;
	public_id: string;
	width: number;
	height: number;
	format: string;
	resource_type: string;
}

/**
 * État du hook useAvatarUpload
 */
interface UseAvatarUploadState {
	isUploading: boolean;
	uploadProgress: number;
	error: string | null;
}

/**
 * Résultat du hook useAvatarUpload
 */
interface UseAvatarUploadResult extends UseAvatarUploadState {
	uploadAvatar: (file: File) => Promise<string | null>;
	deleteAvatar: () => Promise<boolean>;
	resetError: () => void;
}

/**
 * Hook personnalisé pour gérer l'upload et la suppression d'avatar
 *
 * @example
 * ```tsx
 * const { uploadAvatar, deleteAvatar, isUploading, uploadProgress } = useAvatarUpload();
 *
 * const handleFileSelect = async (file: File) => {
 *   const avatarUrl = await uploadAvatar(file);
 *   if (avatarUrl) {
 *     console.log('Avatar uploadé:', avatarUrl);
 *   }
 * };
 * ```
 */
export const useAvatarUpload = (): UseAvatarUploadResult => {
	const [state, setState] = useState<UseAvatarUploadState>({
		isUploading: false,
		uploadProgress: 0,
		error: null,
	});

	const { user, setUser } = useAuthStore();

	/**
	 * Réinitialise l'erreur
	 */
	const resetError = useCallback(() => {
		setState((prev) => ({ ...prev, error: null }));
	}, []);

	/**
	 * Upload un avatar vers Cloudinary puis met à jour le profil utilisateur
	 * @param file - Fichier image à uploader
	 * @returns URL de l'avatar uploadé ou null en cas d'erreur
	 */
	const uploadAvatar = useCallback(
		async (file: File): Promise<string | null> => {
			try {
				// Validation du fichier
				if (!file.type.startsWith('image/')) {
					const errorMsg = 'Le fichier doit être une image';
					setState((prev) => ({ ...prev, error: errorMsg }));
					toast.error(errorMsg);
					return null;
				}

				// Limite de 5MB
				const maxSize = 5 * 1024 * 1024;
				if (file.size > maxSize) {
					const errorMsg = "L'image ne doit pas dépasser 5MB";
					setState((prev) => ({ ...prev, error: errorMsg }));
					toast.error(errorMsg);
					return null;
				}

				setState((prev) => ({
					...prev,
					isUploading: true,
					uploadProgress: 0,
					error: null,
				}));

				// Étape 1: Obtenir les paramètres d'upload depuis le backend
				const uploadParams = await apiClient.get<UploadParams>(
					'/avatar/upload-signature'
				);

				setState((prev) => ({ ...prev, uploadProgress: 20 }));

				// Étape 2: Upload direct vers Cloudinary avec upload preset
				const formData = new FormData();
				formData.append('file', file);
				formData.append('upload_preset', uploadParams.uploadPreset);
				formData.append('folder', uploadParams.folder);

				setState((prev) => ({ ...prev, uploadProgress: 40 }));

				const cloudinaryResponse = await fetch(
					`https://api.cloudinary.com/v1_1/${uploadParams.cloudName}/image/upload`,
					{
						method: 'POST',
						body: formData,
					}
				);

				if (!cloudinaryResponse.ok) {
					throw new Error("Erreur lors de l'upload vers Cloudinary");
				}

				const cloudinaryData: CloudinaryUploadResponse =
					await cloudinaryResponse.json();

				setState((prev) => ({ ...prev, uploadProgress: 70 }));

				// Étape 3: Mettre à jour le profil utilisateur avec la nouvelle URL
				const response = await apiClient.patch<{
					id: string;
					avatarUrl: string;
					message: string;
				}>('/avatar', { avatarUrl: cloudinaryData.secure_url });

				setState((prev) => ({ ...prev, uploadProgress: 90 }));

				// Mettre à jour le store Zustand avec la nouvelle URL d'avatar
				if (user) {
					setUser({
						...user,
						avatarUrl: response.avatarUrl,
					});
				}

				setState((prev) => ({
					...prev,
					uploadProgress: 100,
					isUploading: false,
				}));

				toast.success('Photo de profil mise à jour avec succès');
				return response.avatarUrl;
			} catch (error) {
				const errorMsg =
					error instanceof Error
						? error.message
						: "Erreur lors de l'upload";
				setState((prev) => ({
					...prev,
					isUploading: false,
					uploadProgress: 0,
					error: errorMsg,
				}));
				toast.error(errorMsg);
				return null;
			}
		},
		[user, setUser]
	);

	/**
	 * Supprime l'avatar de l'utilisateur
	 * @returns true si la suppression a réussi, false sinon
	 */
	const deleteAvatar = useCallback(async (): Promise<boolean> => {
		try {
			setState((prev) => ({ ...prev, isUploading: true, error: null }));

			await apiClient.delete<{ message: string }>('/avatar');

			// Mettre à jour le store Zustand pour retirer l'URL d'avatar
			if (user) {
				setUser({
					...user,
					avatarUrl: undefined,
				});
			}

			setState((prev) => ({ ...prev, isUploading: false }));

			toast.success('Photo de profil supprimée avec succès');
			return true;
		} catch (error) {
			const errorMsg =
				error instanceof Error
					? error.message
					: 'Erreur lors de la suppression';
			setState((prev) => ({
				...prev,
				isUploading: false,
				error: errorMsg,
			}));
			toast.error(errorMsg);
			return false;
		}
	}, [user, setUser]);

	return {
		...state,
		uploadAvatar,
		deleteAvatar,
		resetError,
	};
};
