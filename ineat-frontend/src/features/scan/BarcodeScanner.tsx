import type React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
	BrowserMultiFormatReader,
	type Result,
	NotFoundException,
} from '@zxing/library';
import { Keyboard, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { ManualBarcodeInput } from './ManualBarcodeInput';
import { useOpenFoodFacts } from '@/hooks/useOpenFoodFacts';
import type { Product } from '@/schemas/product';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

type ScannerState = 'idle' | 'scanning' | 'manual-input' | 'error';

interface BarcodeScannerProps {
	onProductFound: (localProduct: Partial<Product>) => void;
	onProductNotFound: (barcode: string) => void;
	onError?: (error: string) => void;
	onClose?: () => void;
	autoStart?: boolean;
	className?: string;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
	onProductFound,
	onProductNotFound,
	onError,
	onClose,
	autoStart = true,
	className = '',
}) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
	const isInitializedRef = useRef<boolean>(false);

	const [state, setState] = useState<ScannerState>('idle');
	const [error, setError] = useState<string | null>(null);

	const { searchByBarcode, loading, localProduct, data } = useOpenFoodFacts();

	/**
	 * Arrête le scanner
	 */
	const stopScanning = useCallback((): void => {
		try {
			if (codeReaderRef.current) {
				codeReaderRef.current.reset();
			}
			isInitializedRef.current = false;
		} catch (err: unknown) {
			console.error('Erreur arrêt scanner:', err);
		}
	}, []);

	/**
	 * Gère le résultat du scan
	 */
	const handleScanResult = useCallback(
		(result: Result | null, scanError?: Error): void => {
			if (result) {
				const barcode = result.getText();

				// Vibration de feedback
				if ('vibrate' in navigator) {
					navigator.vibrate(200);
				}

				// Arrêter le scan
				stopScanning();

				// Rechercher dans OpenFoodFacts
				searchByBarcode(barcode).catch((err: unknown) => {
					console.error('Erreur recherche produit:', err);
					onError?.('Erreur lors de la recherche du produit');
				});
			} else if (scanError && !(scanError instanceof NotFoundException)) {
				console.error('Erreur scan:', scanError);
			}
		},
		[stopScanning, searchByBarcode, onError]
	);

	/**
	 * Démarre le scanner de la façon la plus simple possible
	 */
	const startScanner = useCallback(async (): Promise<void> => {
		if (isInitializedRef.current) return;

		try {
			setState('scanning');
			setError(null);

			// Créer le lecteur ZXing
			if (!codeReaderRef.current) {
				codeReaderRef.current = new BrowserMultiFormatReader();
			}

			// Vérifier l'élément vidéo
			if (!videoRef.current) {
				throw new Error('Élément vidéo non disponible');
			}

			// Démarrer le scan avec auto-sélection de caméra
			// null = ZXing choisit automatiquement la meilleure caméra
			await codeReaderRef.current.decodeFromVideoDevice(
				null, // Auto-sélection
				videoRef.current,
				handleScanResult
			);

			isInitializedRef.current = true;
		} catch (err: unknown) {
			console.error('Erreur démarrage scanner:', err);

			const errorMessage =
				err instanceof Error ? err.message : 'Erreur inconnue';

			if (
				errorMessage.includes('Permission denied') ||
				errorMessage.includes('NotAllowedError')
			) {
				setError(
					"Accès caméra refusé. Autorisez l'accès dans les paramètres du navigateur."
				);
			} else if (errorMessage.includes('NotFoundError')) {
				setError('Aucune caméra trouvée sur cet appareil.');
			} else {
				setError(`Erreur du scanner: ${errorMessage}`);
			}

			setState('error');
			isInitializedRef.current = false;
		}
	}, [handleScanResult]);

	/**
	 * Passe en mode saisie manuelle
	 */
	const switchToManualInput = useCallback((): void => {
		stopScanning();
		setState('manual-input');
	}, [stopScanning]);

	/**
	 * Retourne au scan
	 */
	const returnToScan = useCallback((): void => {
		setState('idle');
		setTimeout(() => {
			startScanner();
		}, 100);
	}, [startScanner]);

	/**
	 * Réessayer en cas d'erreur
	 */
	const retry = useCallback((): void => {
		stopScanning();
		setError(null);
		setState('idle');
		setTimeout(() => {
			startScanner();
		}, 500);
	}, [stopScanning, startScanner]);

	// Gestion des résultats de recherche
	useEffect(() => {
		if (localProduct && data) {
			onProductFound(localProduct);
		}
	}, [localProduct, data, onProductFound]);

	// Auto-start
	useEffect(() => {
		if (autoStart && state === 'idle') {
			startScanner();
		}
	}, [autoStart, state, startScanner]);

	// Cleanup
	useEffect(() => {
		return () => {
			stopScanning();
		};
	}, [stopScanning]);

	/**
	 * Rendu du contenu selon l'état
	 */
	const renderContent = (): React.ReactNode => {
		if (state === 'manual-input') {
			return (
				<CardContent className='p-6 space-y-4'>
					<div className='text-center space-y-2'>
						<Keyboard className='size-8 text-success-500 mx-auto' />
						<h3 className='text-lg font-semibold text-neutral-300'>
							Saisie manuelle
						</h3>
						<p className='text-sm text-neutral-200'>
							Saisissez le code-barre manuellement
						</p>
					</div>

					<ManualBarcodeInput
						onProductFound={onProductFound}
						onProductNotFound={onProductNotFound}
						onError={onError}
						className='mt-4'
					/>

					<Button
						onClick={returnToScan}
						variant='outline'
						className='w-full border-success-500 text-success-500 hover:bg-success-50/10'>
						Retour au scan
					</Button>
				</CardContent>
			);
		}

		if (state === 'error') {
			return (
				<CardContent className='p-6 text-center space-y-4'>
					<Alert
						variant='warning'
						className='border-error-50/20 bg-error-50/10'>
						<AlertDescription className='flex flex-col items-center text-neutral-300'>
							<AlertCircle className='size-5 text-error-500' />
							<h3 className='text-lg font-semibold mb-2'>
								Erreur du scanner
							</h3>
							<p className='text-sm text-neutral-200 mb-4'>
								{error}
							</p>
						</AlertDescription>
					</Alert>

					<div className='space-y-2'>
						<Button
							onClick={retry}
							className='w-full bg-success-50 text-neutral-50 hover:bg-success-500/90'>
							Réessayer
						</Button>
						<Button
							onClick={switchToManualInput}
							variant='outline'
							className='w-full border-success-500 text-success-500 hover:bg-success-50/10'>
							Entrer manuellement le code-barre
						</Button>
					</div>
				</CardContent>
			);
		}

		if (loading) {
			return (
				<CardContent className='p-6 text-center space-y-4'>
					<CheckCircle2 className='size-12 text-success-500 mx-auto' />
					<div>
						<h3 className='text-lg font-semibold text-neutral-300'>
							Code-barre détecté !
						</h3>
						<p className='text-sm text-neutral-200'>
							Recherche du produit en cours...
						</p>
					</div>
					<div className='animate-pulse bg-neutral-100 h-2 rounded'></div>
				</CardContent>
			);
		}

		// Interface de scan
		return (
			<div className='relative size-full bg-black'>
				{/* Overlay guide */}
				<div className='absolute inset-0 flex items-center justify-center'>
					<div className='relative'>
						{/* Zone de scan */}
						<div className='size-64 border-2 border-neutral-50 rounded-lg relative'>
							<div className='absolute -top-1 -left-1 size-6 border-t-4 border-l-4 border-success-500 rounded-tl-lg'></div>
							<div className='absolute -top-1 -right-1 size-6 border-t-4 border-r-4 border-success-500 rounded-tr-lg'></div>
							<div className='absolute -bottom-1 -left-1 size-6 border-b-4 border-l-4 border-success-500 rounded-bl-lg'></div>
							<div className='absolute -bottom-1 -right-1 size-6 border-b-4 border-r-4 border-success-500 rounded-br-lg'></div>

							{/* Ligne de scan animée */}
							<div className='absolute inset-x-0 top-1/2 h-0.5 bg-success-500 animate-pulse'></div>
						</div>

						{/* Instructions */}
						<p className='text-neutral-50 text-center mt-4 text-sm font-medium'>
							Centrez le code-barre dans le cadre
						</p>
					</div>
				</div>

				{/* Contrôles */}
				<div className='absolute bottom-6 left-0 right-0 flex justify-center items-center space-x-4'>
					{/* Saisie manuelle */}
					<Button
						onClick={switchToManualInput}
						size='icon'
						className='size-12 rounded-full bg-neutral-300/50 text-neutral-50 border border-neutral-200/30 hover:bg-neutral-300/70'>
						<Keyboard className='size-6' />
					</Button>
				</div>

				{/* Bouton fermer */}
				{onClose && (
					<Button
						onClick={onClose}
						size='icon'
						className='absolute top-4 right-4 size-10 rounded-full bg-neutral-300/50 text-neutral-50 border border-neutral-200/30 hover:bg-neutral-300/70'>
						<X className='size-5' />
					</Button>
				)}
			</div>
		);
	};

	return (
		<Card
			className={`bg-neutral-50 rounded-2xl shadow-xl overflow-hidden ${className}`}>
			<video
				ref={videoRef}
				className={`size-full object-cover ${
					state === 'scanning' ? 'block' : 'hidden'
				}`}
				playsInline
				muted
				autoPlay
			/>

			{renderContent()}
		</Card>
	);
};
