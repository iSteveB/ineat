import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
	ArrowLeft,
	Crown,
	Sparkles,
	CheckCircle,
	AlertTriangle,
	Camera,
	Clock,
} from 'lucide-react';
import { ReceiptCamera } from '@/features/receipt/ReceiptCamera';
import { ReceiptProcessingLoader } from '@/features/receipt/ReceiptProcessingLoader';
import { receiptService } from '@/services/receiptService';
import { useUser } from '@/hooks/useAuth';
import { useReceiptStore } from '@/stores/receiptStore';
import type { ReceiptStatusData } from '@/services/receiptService';

// ===== TYPES =====

/**
 * Étapes du workflow de scan
 */
type ScanStep = 'capture' | 'uploading' | 'processing' | 'completed' | 'error';

/**
 * État de la page
 */
interface ScanPageState {
	step: ScanStep;
	receiptId: string | null;
	uploadError: string | null;
	isUploading: boolean;
}

// ===== COMPOSANT PRINCIPAL =====

/**
 * Page principale pour scanner des tickets de caisse
 * Gère le workflow complet de capture → upload → traitement → résultats
 *
 * Workflow :
 * 1. Capture : Prendre/sélectionner une photo
 * 2. Upload : Envoi vers le serveur
 * 3. Processing : Traitement OCR et matching
 * 4. Completed : Redirection vers les résultats
 */
export const ReceiptScanPage: React.FC = () => {
	// ===== NAVIGATION ET AUTH =====

	const navigate = useNavigate();
	const searchParams = useSearch({ strict: false });
	const { data: user, isLoading: userLoading } = useUser();

	// ===== STORE =====

	const setActiveReceipt = useReceiptStore((state) => state.setActiveReceipt);
	const clearActiveReceipt = useReceiptStore(
		(state) => state.clearActiveReceipt
	);

	// ===== STATE =====

	const [state, setState] = useState<ScanPageState>({
		step: 'capture',
		receiptId: null,
		uploadError: null,
		isUploading: false,
	});

	// ===== VÉRIFICATIONS =====

	// Vérification si on revient d'une autre page avec un receiptId
	const existingReceiptId = (searchParams as { receiptId?: string })
		?.receiptId;

	// Vérifier si l'utilisateur a un abonnement premium ou admin
	const isPremium =
		user?.subscription === 'PREMIUM' || user?.subscription === 'ADMIN';
	// ===== EFFETS =====

	/**
	 * Vérifier le statut premium au chargement
	 */
	useEffect(() => {
		if (!userLoading && !isPremium) {
			toast.error('Cette fonctionnalité nécessite un abonnement Premium');
			navigate({ to: '/app/subscription' });
		}
	}, [isPremium, userLoading, navigate]);

	/**
	 * Si on a un receiptId en paramètre, aller directement au traitement
	 */
	useEffect(() => {
		if (existingReceiptId && state.step === 'capture') {
			setState((prev) => ({
				...prev,
				step: 'processing',
				receiptId: existingReceiptId,
			}));

			// Mettre à jour le store
			setActiveReceipt({
				receiptId: existingReceiptId,
				status: 'processing',
				progress: 0,
			});
		}
	}, [existingReceiptId, state.step, setActiveReceipt]);

	/**
	 * Cleanup au démontage
	 */
	useEffect(() => {
		return () => {
			// Nettoyer le store si on quitte la page
			if (state.step !== 'processing') {
				clearActiveReceipt();
			}
		};
	}, [state.step, clearActiveReceipt]);

	// ===== HANDLERS =====

	/**
	 * Gère la capture/sélection d'une image
	 */
	const handleImageCapture = useCallback(
		async (file: File) => {
			setState((prev) => ({
				...prev,
				step: 'uploading',
				isUploading: true,
				uploadError: null,
			}));

			try {
				const response = await receiptService.uploadReceipt(file);

				if (response.success) {
					// Mettre à jour l'état local
					setState((prev) => ({
						...prev,
						step: 'processing',
						receiptId: response.data.receiptId,
						isUploading: false,
					}));

					// Mettre à jour le store
					setActiveReceipt({
						receiptId: response.data.receiptId,
						status: 'processing',
						progress: 0,
						estimatedTimeRemaining: response.data.estimatedTime,
					});

					toast.success('Image uploadée avec succès');
				} else {
					throw new Error("Échec de l'upload");
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: "Erreur lors de l'upload";

				setState((prev) => ({
					...prev,
					step: 'error',
					uploadError: errorMessage,
					isUploading: false,
				}));

				toast.error(errorMessage);
			}
		},
		[setActiveReceipt]
	);

	/**
	 * Gère les erreurs de capture
	 */
	const handleCaptureError = useCallback((error: string) => {
		toast.error(error);
	}, []);

	/**
	 * Gère la fin du traitement
	 */
	const handleProcessingCompleted = useCallback(
		(data: ReceiptStatusData) => {
			setState((prev) => ({ ...prev, step: 'completed' }));

			toast.success('Ticket traité avec succès !');

			// Rediriger vers les résultats après un court délai
			setTimeout(() => {
				navigate({
					to: '/app/receipt/$receiptId/results',
					params: { receiptId: data.id },
				});
			}, 1500);
		},
		[navigate]
	);

	/**
	 * Gère les erreurs de traitement
	 */
	const handleProcessingError = useCallback((error: string) => {
		setState((prev) => ({
			...prev,
			step: 'error',
			uploadError: error,
		}));

		toast.error('Erreur lors du traitement : ' + error);
	}, []);

	/**
	 * Gère l'annulation du traitement
	 */
	const handleCancel = useCallback(() => {
		clearActiveReceipt();
		navigate({ to: '/app/inventory' });
	}, [navigate, clearActiveReceipt]);

	/**
	 * Recommence le processus
	 */
	const handleRetry = useCallback(() => {
		clearActiveReceipt();
		setState({
			step: 'capture',
			receiptId: null,
			uploadError: null,
			isUploading: false,
		});
	}, [clearActiveReceipt]);

	// ===== RENDU DES SECTIONS =====

	/**
	 * Rendu de l'en-tête avec navigation
	 */
	const renderHeader = () => (
		<div className='flex items-center justify-between mb-6'>
			<div className='flex items-center gap-3'>
				<Button
					variant='ghost'
					size='sm'
					onClick={() => navigate({ to: '/app/inventory' })}
					className='p-2'>
					<ArrowLeft className='size-4' />
				</Button>
				<div>
					<h1 className='text-2xl font-bold'>Scanner un ticket</h1>
					<p className='text-sm text-muted-foreground'>
						Ajoutez rapidement vos courses à l'inventaire
					</p>
				</div>
			</div>

			<Badge variant='outline' className='gap-1'>
				<Crown className='size-3 text-yellow-500' />
				Premium
			</Badge>
		</div>
	);

	/**
	 * Rendu de l'étape de capture
	 */
	const renderCaptureStep = () => (
		<div className='space-y-6'>
			<ReceiptCamera
				onCapture={handleImageCapture}
				onError={handleCaptureError}
				isLoading={state.isUploading}
				preferredSource='both'
				title='Photographiez votre ticket'
			/>

			{/* Conseils */}
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2 text-lg'>
						<Sparkles className='size-5 text-primary' />
						Conseils pour une meilleure reconnaissance
					</CardTitle>
				</CardHeader>
				<CardContent className='space-y-3'>
					<div className='flex items-start gap-3'>
						<Camera className='size-5 text-muted-foreground mt-0.5' />
						<div>
							<h4 className='font-medium'>Photo de qualité</h4>
							<p className='text-sm text-muted-foreground'>
								Assurez-vous que le ticket est bien éclairé et
								net
							</p>
						</div>
					</div>

					<div className='flex items-start gap-3'>
						<CheckCircle className='size-5 text-muted-foreground mt-0.5' />
						<div>
							<h4 className='font-medium'>Ticket complet</h4>
							<p className='text-sm text-muted-foreground'>
								Incluez le haut et le bas du ticket avec les
								totaux
							</p>
						</div>
					</div>

					<div className='flex items-start gap-3'>
						<Clock className='size-5 text-muted-foreground mt-0.5' />
						<div>
							<h4 className='font-medium'>Traitement rapide</h4>
							<p className='text-sm text-muted-foreground'>
								Le scan prend généralement 30 secondes à 2
								minutes
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);

	/**
	 * Rendu de l'étape d'upload
	 */
	const renderUploadingStep = () => (
		<div className='text-center space-y-4'>
			<Card>
				<CardContent className='p-8'>
					<div className='flex justify-center mb-4'>
						<div className='size-16 bg-primary/10 rounded-full flex items-center justify-center'>
							<Camera className='size-8 text-primary animate-pulse' />
						</div>
					</div>

					<h3 className='text-lg font-semibold mb-2'>
						Upload en cours...
					</h3>
					<p className='text-sm text-muted-foreground mb-4'>
						Envoi de votre image vers nos serveurs
					</p>

					<div className='w-full bg-muted rounded-full h-2'>
						<div className='bg-primary h-2 rounded-full animate-pulse w-3/4'></div>
					</div>
				</CardContent>
			</Card>
		</div>
	);

	/**
	 * Rendu de l'étape de traitement
	 */
	const renderProcessingStep = () => {
		if (!state.receiptId) return null;

		return (
			<ReceiptProcessingLoader
				receiptId={state.receiptId}
				onCompleted={handleProcessingCompleted}
				onError={handleProcessingError}
				onCancel={handleCancel}
				title='Analyse de votre ticket en cours'
			/>
		);
	};

	/**
	 * Rendu de l'étape de succès
	 */
	const renderCompletedStep = () => (
		<Card>
			<CardContent className='p-8 text-center'>
				<div className='flex justify-center mb-4'>
					<CheckCircle className='size-16 text-green-600' />
				</div>

				<h3 className='text-lg font-semibold text-green-600 mb-2'>
					Traitement terminé !
				</h3>
				<p className='text-sm text-muted-foreground mb-4'>
					Redirection vers les résultats...
				</p>

				<div className='w-full bg-muted rounded-full h-2'>
					<div className='bg-green-600 h-2 rounded-full animate-pulse w-full'></div>
				</div>
			</CardContent>
		</Card>
	);

	/**
	 * Rendu de l'étape d'erreur
	 */
	const renderErrorStep = () => (
		<div className='space-y-4'>
			<Alert variant='warning'>
				<AlertTriangle className='size-4' />
				<AlertDescription>
					{state.uploadError || 'Une erreur est survenue'}
				</AlertDescription>
			</Alert>

			<Card>
				<CardContent className='p-6 text-center'>
					<h3 className='text-lg font-semibold mb-4'>
						Que faire maintenant ?
					</h3>

					<div className='space-y-3'>
						<Button onClick={handleRetry} className='w-full'>
							Réessayer avec une nouvelle photo
						</Button>

						<Button
							variant='outline'
							onClick={() => navigate({ to: '/app/inventory' })}
							className='w-full'>
							Retour à l'inventaire
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);

	// ===== RENDU PRINCIPAL =====

	// Chargement de la vérification utilisateur
	if (userLoading) {
		return (
			<div className='container mx-auto px-4 py-8'>
				<div className='max-w-md mx-auto'>
					<Card>
						<CardContent className='p-8 text-center'>
							<div className='animate-spin size-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4'></div>
							<p className='text-muted-foreground'>
								Vérification des permissions...
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	// Utilisateur non premium
	if (!isPremium) {
		return (
			<div className='container mx-auto px-4 py-8'>
				<div className='max-w-md mx-auto'>
					<Card>
						<CardContent className='p-8 text-center'>
							<Crown className='size-16 text-yellow-500 mx-auto mb-4' />
							<h2 className='text-xl font-semibold mb-2'>
								Fonctionnalité Premium
							</h2>
							<p className='text-muted-foreground mb-4'>
								Le scan de tickets nécessite un abonnement
								Premium
							</p>
							<Button
								onClick={() =>
									navigate({ to: '/app/subscription' })
								}
								className='w-full'>
								Découvrir Premium
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className='container mx-auto px-4 py-8'>
			<div className='max-w-md mx-auto'>
				{renderHeader()}

				{/* Contenu principal selon l'étape */}
				{state.step === 'capture' && renderCaptureStep()}
				{state.step === 'uploading' && renderUploadingStep()}
				{state.step === 'processing' && renderProcessingStep()}
				{state.step === 'completed' && renderCompletedStep()}
				{state.step === 'error' && renderErrorStep()}
			</div>
		</div>
	);
};

export default ReceiptScanPage;
