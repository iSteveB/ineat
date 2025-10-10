import { useState, useRef, ChangeEvent } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { Upload, Loader2, Trash2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarUploadModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentAvatarUrl: string | null;
}

export const AvatarUploadModal: React.FC<AvatarUploadModalProps> = ({
	open,
	onOpenChange,
	currentAvatarUrl,
}) => {
	const { uploadAvatar, deleteAvatar, isUploading, uploadProgress, error, resetError } =
		useAvatarUpload();

	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validation du fichier
		if (!file.type.startsWith('image/')) {
			resetError();
			return;
		}

		// Limite de 5MB
		const maxSize = 5 * 1024 * 1024;
		if (file.size > maxSize) {
			resetError();
			return;
		}

		// Créer un aperçu
		const reader = new FileReader();
		reader.onloadend = () => {
			setPreviewUrl(reader.result as string);
		};
		reader.readAsDataURL(file);

		setSelectedFile(file);
		resetError();
	};

	const handleUpload = async () => {
		if (!selectedFile) return;

		const avatarUrl = await uploadAvatar(selectedFile);
		if (avatarUrl) {
			// Réinitialiser et fermer le modal
			handleClose();
		}
	};

	const handleDelete = async () => {
		const success = await deleteAvatar();
		if (success) {
			handleClose();
		}
	};

	const handleClose = () => {
		setPreviewUrl(null);
		setSelectedFile(null);
		resetError();
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
		onOpenChange(false);
	};

	const handleTriggerFileInput = () => {
		fileInputRef.current?.click();
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<ImageIcon className='size-5 text-success-50' />
						Modifier votre photo de profil
					</DialogTitle>
					<DialogDescription>
						Choisissez une nouvelle photo de profil ou supprimez l'actuelle
					</DialogDescription>
				</DialogHeader>

				<div className='space-y-4'>
					{/* Aperçu de l'image */}
					<div className='flex justify-center'>
						<div className='relative size-32 rounded-full overflow-hidden bg-gradient-to-br from-success-50 to-success-50/80 flex items-center justify-center shadow-lg'>
							{previewUrl ? (
								<img
									src={previewUrl}
									alt='Aperçu'
									className='size-full object-cover'
								/>
							) : currentAvatarUrl ? (
								<img
									src={currentAvatarUrl}
									alt='Avatar actuel'
									className='size-full object-cover'
								/>
							) : (
								<ImageIcon className='size-12 text-neutral-50' />
							)}
						</div>
					</div>

					{/* Input file caché */}
					<input
						ref={fileInputRef}
						type='file'
						accept='image/*'
						onChange={handleFileSelect}
						className='hidden'
					/>

					{/* Boutons d'action */}
					<div className='space-y-2'>
						<Button
							onClick={handleTriggerFileInput}
							variant='outline'
							className='w-full'
							disabled={isUploading}>
							<Upload className='size-4 mr-2' />
							{selectedFile ? 'Choisir une autre photo' : 'Choisir une photo'}
						</Button>

						{currentAvatarUrl && !selectedFile && (
							<Button
								onClick={handleDelete}
								variant='error'
								className='w-full'
								disabled={isUploading}>
								{isUploading ? (
									<>
										<Loader2 className='size-4 mr-2 animate-spin' />
										Suppression...
									</>
								) : (
									<>
										<Trash2 className='size-4 mr-2' />
										Supprimer la photo
									</>
								)}
							</Button>
						)}
					</div>

					{/* Barre de progression */}
					{isUploading && (
						<div className='space-y-2'>
							<div className='w-full bg-gray-200 rounded-full h-2 overflow-hidden'>
								<div
									className='bg-success-50 h-2 transition-all duration-300 ease-out'
									style={{ width: `${uploadProgress}%` }}
								/>
							</div>
							<p className='text-sm text-center text-neutral-200'>
								Upload en cours... {uploadProgress}%
							</p>
						</div>
					)}

					{/* Informations sur les contraintes */}
					{!selectedFile && !isUploading && (
						<Alert className='border-info-50/20 bg-info-50/10'>
							<AlertCircle className='size-4 text-info-50' />
							<AlertDescription className='text-sm text-neutral-300'>
								<strong>Formats acceptés :</strong> JPG, PNG, GIF
								<br />
								<strong>Taille maximale :</strong> 5 MB
							</AlertDescription>
						</Alert>
					)}

					{/* Erreur */}
					{error && (
						<Alert variant='error'>
							<AlertCircle className='size-4' />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{/* Nom du fichier sélectionné */}
					{selectedFile && !isUploading && (
						<Alert className='border-success-50/20 bg-success-50/10'>
							<AlertCircle className='size-4 text-success-50' />
							<AlertDescription className='text-sm text-neutral-300'>
								<strong>Fichier sélectionné :</strong> {selectedFile.name}
								<br />
								<strong>Taille :</strong>{' '}
								{(selectedFile.size / 1024 / 1024).toFixed(2)} MB
							</AlertDescription>
						</Alert>
					)}
				</div>

				<DialogFooter>
					<Button
						variant='outline'
						onClick={handleClose}
						disabled={isUploading}>
						Annuler
					</Button>
					{selectedFile && (
						<Button
							onClick={handleUpload}
							disabled={isUploading}
							className={cn(
								'bg-gradient-to-r from-success-50 to-success-50',
								'hover:from-success-50/90 hover:to-success-50/90',
								'text-neutral-50'
							)}>
							{isUploading ? (
								<>
									<Loader2 className='size-4 mr-2 animate-spin' />
									Upload...
								</>
							) : (
								<>
									<Upload className='size-4 mr-2' />
									Enregistrer
								</>
							)}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};