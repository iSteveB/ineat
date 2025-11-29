import { useEffect, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
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
import { useUser } from '@/hooks/useAuth';
import { useReceiptStore, receiptSelectors } from '@/stores/receiptStore';

/**
 * Page principale pour scanner des tickets de caisse
 *
 * Workflow simplifié avec le nouveau store :
 * 1. Capture photo
 * 2. uploadReceipt() → Gère automatiquement upload + polling
 * 3. Redirection vers résultats quand status === 'results'
 */
export const ReceiptScanPage = () => {
	// ===== HOOKS =====
	const navigate = useNavigate();
	const { data: user, isLoading: userLoading } = useUser();

	// ===== STORE =====
	const uploadReceipt = useReceiptStore((s) => s.uploadReceipt);
	const reset = useReceiptStore((s) => s.reset);
	const status = useReceiptStore(receiptSelectors.status);
	const error = useReceiptStore(receiptSelectors.error);
	const analysis = useReceiptStore(receiptSelectors.analysis);
	const currentReceiptId = useReceiptStore(receiptSelectors.currentReceiptId);

	// ===== VÉRIFICATIONS =====
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
	 * Redirection automatique vers résultats quand complété
	 */
	useEffect(() => {
		if (status === 'results' && analysis) {
			navigate({
				to: '/app/receipt/$receiptId/results',
				params: { receiptId: analysis.receiptId },
			});
		}
	}, [status, analysis, navigate]);

	/**
	 * Cleanup au démontage
	 */
	useEffect(() => {
		return () => {
			if (status !== 'analyzing') {
				reset();
			}
		};
	}, [status, reset]);

	// ===== HANDLERS =====

	/**
	 * Gère la capture/upload d'une image
	 */
	const handleImageCapture = useCallback(
		async (file: File) => {
			try {
				await uploadReceipt(file);
				// Le store gère automatiquement :
				// - status: 'uploading'
				// - status: 'analyzing' (polling)
				// - status: 'results' → redirection automatique
			} catch (err) {
				// L'erreur est déjà gérée dans le store
				console.error('Upload error:', err);
			}
		},
		[uploadReceipt]
	);

	/**
	 * Gère les erreurs de capture
	 */
	const handleCaptureError = useCallback((errorMsg: string) => {
		toast.error(errorMsg);
	}, []);

	/**
	 * Recommence le processus
	 */
	const handleRetry = useCallback(() => {
		reset();
	}, [reset]);

	/**
	 * Annule et retourne à l'inventaire
	 */
	const handleCancel = useCallback(() => {
		reset();
		navigate({ to: '/app/inventory' });
	}, [reset, navigate]);

	// ===== RENDU DES SECTIONS =====

	/**
	 * En-tête avec navigation
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
	 * Étape de capture
	 */
	const renderCaptureStep = () => (
		<div className='space-y-6'>
			<ReceiptCamera
				onCapture={handleImageCapture}
				onError={handleCaptureError}
				isLoading={status === 'uploading'}
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
								Le scan prend généralement 15 à 30 secondes
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);

	/**
	 * Étape d'upload
	 */
	const renderUploadingStep = () => (
		<Card>
			<CardContent className='p-8'>
				<div className='flex justify-center mb-4'>
					<div className='size-16 bg-primary/10 rounded-full flex items-center justify-center'>
						<Camera className='size-8 text-primary animate-pulse' />
					</div>
				</div>

				<h3 className='text-lg font-semibold mb-2 text-center'>
					Upload en cours...
				</h3>
				<p className='text-sm text-muted-foreground mb-4 text-center'>
					Envoi de votre image vers nos serveurs
				</p>

				<div className='w-full bg-muted rounded-full h-2'>
					<div className='bg-primary h-2 rounded-full animate-pulse w-3/4'></div>
				</div>
			</CardContent>
		</Card>
	);

	/**
	 * Étape de traitement (analyse OCR + LLM)
	 */
	const renderProcessingStep = () => {
		// Utiliser currentReceiptId au lieu de analysis.receiptId
		// car analysis est null pendant le polling
		if (!currentReceiptId) {
			return (
				<Card>
					<CardContent className='p-8 text-center'>
						<div className='animate-spin size-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4'></div>
						<p className='text-muted-foreground'>
							Préparation de l'analyse...
						</p>
					</CardContent>
				</Card>
			);
		}

		return (
			<ReceiptProcessingLoader
				receiptId={currentReceiptId}
				onCancel={handleCancel}
				title='Analyse de votre ticket en cours'
			/>
		);
	};

	/**
	 * Étape d'erreur
	 */
	const renderErrorStep = () => (
		<div className='space-y-4'>
			<Alert variant='error'>
				<AlertTriangle className='size-4' />
				<AlertDescription>
					{error || 'Une erreur est survenue'}
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

				{/* Contenu selon le statut */}
				{status === 'idle' && renderCaptureStep()}
				{status === 'uploading' && renderUploadingStep()}
				{status === 'analyzing' && renderProcessingStep()}
				{status === 'error' && renderErrorStep()}
			</div>
		</div>
	);
};

export default ReceiptScanPage;
