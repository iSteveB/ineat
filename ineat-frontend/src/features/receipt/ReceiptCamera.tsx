import React, { useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	validateImageFile,
	createImagePreview,
	ACCEPTED_IMAGE_FORMATS,
	MAX_FILE_SIZE_MB,
	type CaptureSource,
} from '@/utils/receiptUtils';

// ===== TYPES =====

/**
 * Props du composant ReceiptCamera
 */
interface ReceiptCameraProps {
	/**
	 * Callback appelé quand une image est capturée/sélectionnée
	 */
	onCapture: (file: File) => void;

	/**
	 * Callback appelé en cas d'erreur
	 */
	onError: (error: string) => void;

	/**
	 * Indique si un upload est en cours
	 */
	isLoading?: boolean;

	/**
	 * Source préférée (camera, file, ou both)
	 * @default 'both'
	 */
	preferredSource?: CaptureSource;

	/**
	 * Titre du composant
	 */
	title?: string;

	/**
	 * Description du composant
	 */
	description?: string;

	/**
	 * Classe CSS additionnelle
	 */
	className?: string;
}

// ===== COMPOSANT =====

/**
 * Composant de capture d'image pour les tickets de caisse
 *
 * Fonctionnalités :
 * - Capture via caméra (mobile)
 * - Sélection de fichier (desktop/mobile)
 * - Prévisualisation de l'image
 * - Validation de fichier (type, taille)
 * - États de chargement
 * - Gestion d'erreurs
 *
 * @example
 * ```tsx
 * <ReceiptCamera
 *   onCapture={(file) => uploadReceipt(file)}
 *   onError={(error) => toast.error(error)}
 *   isLoading={isUploading}
 * />
 * ```
 */
export const ReceiptCamera: React.FC<ReceiptCameraProps> = ({
	onCapture,
	onError,
	isLoading = false,
	preferredSource = 'both',
	title = 'Prendre une photo du ticket',
	description = 'Utilisez votre caméra ou sélectionnez une image',
	className,
}) => {
	// ===== STATE =====

	const [preview, setPreview] = useState<string | null>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Refs pour les inputs
	const cameraInputRef = useRef<HTMLInputElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// ===== VALIDATION =====

	// Utilise l'utilitaire de validation
	const validateFile = validateImageFile;

	// ===== HANDLERS =====

	/**
	 * Gère la sélection d'un fichier
	 */
	const handleFileSelect = useCallback(
		async (event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file) return;

			// Réinitialiser l'erreur
			setError(null);

			// Valider le fichier
			const validationError = validateFile(file);
			if (validationError) {
				setError(validationError);
				onError(validationError);
				return;
			}

			// Créer la prévisualisation
			try {
				const previewUrl = await createImagePreview(file);
				setPreview(previewUrl);
				setSelectedFile(file);
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: 'Erreur lors de la lecture du fichier';
				setError(errorMessage);
				onError(errorMessage);
			}
		},
		[validateFile, onError]
	);

	/**
	 * Confirme la capture et envoie le fichier
	 */
	const handleConfirm = useCallback(() => {
		if (!selectedFile) return;

		onCapture(selectedFile);
	}, [selectedFile, onCapture]);

	/**
	 * Annule la sélection et réinitialise
	 */
	const handleCancel = useCallback(() => {
		setPreview(null);
		setSelectedFile(null);
		setError(null);

		// Réinitialiser les inputs
		if (cameraInputRef.current) {
			cameraInputRef.current.value = '';
		}
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	}, []);

	/**
	 * Déclenche l'input caméra
	 */
	const triggerCamera = useCallback(() => {
		cameraInputRef.current?.click();
	}, []);

	/**
	 * Déclenche l'input fichier
	 */
	const triggerFileSelect = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	// ===== RENDU =====

	/**
	 * Rendu de la prévisualisation
	 */
	const renderPreview = () => {
		if (!preview) return null;

		return (
			<div className='space-y-4'>
				<div className='relative rounded-lg overflow-hidden border-2 border-primary'>
					<img
						src={preview}
						alt='Prévisualisation du ticket'
						className='w-full h-auto'
					/>

					{/* Badge de validation */}
					<div className='absolute top-2 right-2'>
						<div className='bg-green-500 text-white rounded-full p-2'>
							<CheckCircle className='size-5' />
						</div>
					</div>
				</div>

				{/* Actions */}
				<div className='flex gap-2'>
					<Button
						onClick={handleConfirm}
						disabled={isLoading}
						className='flex-1'>
						{isLoading ? (
							<>
								<div className='size-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2' />
								Upload en cours...
							</>
						) : (
							<>
								<Upload className='size-4 mr-2' />
								Confirmer et envoyer
							</>
						)}
					</Button>

					<Button
						onClick={handleCancel}
						variant='outline'
						disabled={isLoading}>
						<X className='size-4 mr-2' />
						Annuler
					</Button>
				</div>
			</div>
		);
	};

	/**
	 * Rendu des boutons de capture
	 */
	const renderCaptureButtons = () => {
		if (preview) return null;

		const showCamera =
			preferredSource === 'camera' || preferredSource === 'both';
		const showFile =
			preferredSource === 'file' || preferredSource === 'both';

		return (
			<div className='space-y-3'>
				{showCamera && (
					<Button
						onClick={triggerCamera}
						variant='default'
						className='w-full h-16'
						disabled={isLoading}>
						<Camera className='size-5 mr-2' />
						Prendre une photo
					</Button>
				)}

				{showFile && (
					<Button
						onClick={triggerFileSelect}
						variant='outline'
						className='w-full h-16'
						disabled={isLoading}>
						<Upload className='size-5 mr-2' />
						Sélectionner une image
					</Button>
				)}
			</div>
		);
	};

	/**
	 * Rendu de l'erreur
	 */
	const renderError = () => {
		if (!error) return null;

		return (
			<Alert variant='warning'>
				<AlertTriangle className='size-4' />
				<AlertDescription>{error}</AlertDescription>
			</Alert>
		);
	};

	return (
		<Card className={cn('w-full', className)}>
			<CardHeader>
				<CardTitle className='flex items-center gap-2'>
					<Camera className='size-5' />
					{title}
				</CardTitle>
				{description && (
					<p className='text-sm text-muted-foreground'>
						{description}
					</p>
				)}
			</CardHeader>

			<CardContent className='space-y-4'>
				{/* Inputs cachés */}
				<input
					ref={cameraInputRef}
					type='file'
					accept={ACCEPTED_IMAGE_FORMATS}
					capture='environment'
					onChange={handleFileSelect}
					className='hidden'
					disabled={isLoading}
				/>

				<input
					ref={fileInputRef}
					type='file'
					accept={ACCEPTED_IMAGE_FORMATS}
					onChange={handleFileSelect}
					className='hidden'
					disabled={isLoading}
				/>

				{/* Affichage conditionnel */}
				{renderError()}
				{renderPreview()}
				{renderCaptureButtons()}

				{/* Informations */}
				{!preview && (
					<div className='text-xs text-muted-foreground space-y-1'>
						<p>• Formats acceptés : JPEG, PNG, HEIC</p>
						<p>• Taille maximale : {MAX_FILE_SIZE_MB}MB</p>
						<p>• Assurez-vous que le ticket est bien visible</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
};

export type { ReceiptCameraProps };
