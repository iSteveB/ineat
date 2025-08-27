import type React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
	BrowserMultiFormatReader,
	type Result,
	NotFoundException,
} from '@zxing/library';
import { Keyboard, AlertCircle, CheckCircle2, X, Camera } from 'lucide-react';
import { ManualBarcodeInput } from './ManualBarcodeInput';
import { useOpenFoodFacts } from '@/hooks/useOpenFoodFacts';
import type { Product } from '@/schemas/product';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

type ScannerState =
	| 'initializing'
	| 'scanning'
	| 'manual-input'
	| 'error'
	| 'searching';

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
	const streamRef = useRef<MediaStream | null>(null);
	const isInitializedRef = useRef<boolean>(false);

	const [state, setState] = useState<ScannerState>('initializing');
	const [error, setError] = useState<string | null>(null);
	const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

	const {
		searchByBarcode,
		localProduct,
		data,
		error: offError,
	} = useOpenFoodFacts();

	/**
	 * Arrête le scanner proprement
	 */
	const stopScanning = useCallback((): void => {
		try {
			if (codeReaderRef.current) {
				codeReaderRef.current.reset();
			}

			streamRef.current = null;
			isInitializedRef.current = false;
		} catch (err: unknown) {
			console.error('Erreur arrêt scanner:', err);
		}
	}, []);

	/**
	 * Gère les erreurs du scanner
	 */
	const handleScannerError = useCallback(
		(err: unknown): void => {
			const errorMessage =
				err instanceof Error ? err.message : 'Erreur inconnue';

			let userFriendlyMessage: string;

			if (
				errorMessage.includes('Permission denied') ||
				errorMessage.includes('NotAllowedError')
			) {
				userFriendlyMessage =
					"Accès caméra refusé. Veuillez autoriser l'accès dans les paramètres de votre navigateur.";
			} else if (errorMessage.includes('NotFoundError')) {
				userFriendlyMessage = 'Aucune caméra trouvée sur cet appareil.';
			} else if (errorMessage.includes('NotSupportedError')) {
				userFriendlyMessage =
					'Votre navigateur ne supporte pas cette fonctionnalité.';
			} else {
				userFriendlyMessage = `Erreur du scanner : ${errorMessage}`;
			}

			setError(userFriendlyMessage);
			setState('error');
			isInitializedRef.current = false;
			onError?.(userFriendlyMessage);
		},
		[onError]
	);

	/**
	 * Gère le résultat du scan
	 */
	const handleScanResult = useCallback(
		(result: Result | null, scanError?: Error): void => {
			if (result) {
				const barcode = result.getText();
				console.log('Code-barre scanné:', barcode);

				// Feedback haptique
				if ('vibrate' in navigator) {
					navigator.vibrate(200);
				}

				// Arrêter le scan
				stopScanning();
				setScannedBarcode(barcode);
				setState('searching');

				// Rechercher dans OpenFoodFacts
				searchByBarcode(barcode).catch((err: unknown) => {
					console.error('Erreur recherche OpenFoodFacts:', err);
					onError?.('Erreur lors de la recherche du produit');
				});
			} else if (scanError && !(scanError instanceof NotFoundException)) {
				console.error('Erreur scan:', scanError);
				// Les erreurs NotFoundException sont normales (pas de code-barre détecté)
			}
		},
		[stopScanning, searchByBarcode, onError]
	);

	/**
	 * Démarre le scanner
	 */
	const startScanner = useCallback(async (): Promise<void> => {
		if (isInitializedRef.current) return;

		try {
			setState('initializing');
			setError(null);

			// Petit délai pour que la vidéo soit rendue
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Créer le lecteur ZXing si nécessaire
			if (!codeReaderRef.current) {
				codeReaderRef.current = new BrowserMultiFormatReader();
			}

			// Vérifier l'élément vidéo
			if (!videoRef.current) {
				throw new Error('Élément vidéo non disponible');
			}

			// Configurer les contraintes avec la caméra arrière préférée
			const constraints: MediaStreamConstraints = {
				video: {
					facingMode: 'environment', // Caméra arrière préférée
					width: { ideal: 1280 },
					height: { ideal: 720 },
				},
			};

			// Obtenir le flux média
			const stream = await navigator.mediaDevices.getUserMedia(
				constraints
			);
			streamRef.current = stream;

			// Démarrer le scan avec ZXing
			await codeReaderRef.current.decodeFromStream(
				stream,
				videoRef.current,
				handleScanResult
			);

			setState('scanning');
			isInitializedRef.current = true;
		} catch (err: unknown) {
			console.error('Erreur démarrage scanner:', err);
			handleScannerError(err);
		}
	}, [handleScanResult, handleScannerError]);

	/**
	 * Passe en mode saisie manuelle
	 */
	const switchToManualInput = useCallback((): void => {
		stopScanning();
		setState('manual-input');
	}, [stopScanning]);

	/**
	 * Retourne au scan depuis la saisie manuelle
	 */
	const returnToScan = useCallback((): void => {
		setState('initializing');
		setScannedBarcode(null);
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
		setScannedBarcode(null);
		setTimeout(() => {
			startScanner();
		}, 500);
	}, [stopScanning, startScanner]);

	// Auto-start du scanner
	useEffect(() => {
		if (autoStart && state === 'initializing') {
			startScanner();
		}
	}, [autoStart, state, startScanner]);

	// Cleanup à la destruction
	useEffect(() => {
		return () => {
			stopScanning();
		};
	}, [stopScanning]);

	// Gestion des résultats de recherche OpenFoodFacts
	useEffect(() => {
		if (state === 'searching') {
			if (localProduct && data) {
				console.log('Produit trouvé dans OpenFoodFacts:', localProduct);
				onProductFound(localProduct);
			} else if (
				offError &&
				offError.type === 'PRODUCT_NOT_FOUND' &&
				scannedBarcode
			) {
				console.log(
					'Produit non trouvé dans OpenFoodFacts:',
					scannedBarcode
				);
				onProductNotFound(scannedBarcode);
			} else if (offError && offError.type !== 'PRODUCT_NOT_FOUND') {
				// Autres erreurs (réseau, etc.)
				console.error('Erreur OpenFoodFacts:', offError);
				onError?.(offError.message || 'Erreur lors de la recherche');
				setState('error');
				setError(offError.message || 'Erreur lors de la recherche');
			}
		}
	}, [
		state,
		localProduct,
		data,
		offError,
		scannedBarcode,
		onProductFound,
		onProductNotFound,
		onError,
	]);

	/**
	 * Rendu du contenu selon l'état
	 */
	const renderContent = (): React.ReactNode => {
		switch (state) {
			case 'manual-input':
				return (
					<div className='min-h-screen flex items-center justify-center'>
						<Card className='w-full max-w-lg border-0 bg-neutral-50 shadow-xl rounded-2xl'>
							<CardContent className='p-8 text-center space-y-6'>
								<div className='space-y-4'>
									<Keyboard className='size-12 text-accent mx-auto' />
									<div>
										<h3 className='text-xl font-semibold text-neutral-900 mb-2'>
											Saisie manuelle
										</h3>
										<p className='text-sm text-neutral-600'>
											Saisissez le code-barre manuellement
										</p>
									</div>
								</div>

								<ManualBarcodeInput
									onProductFound={onProductFound}
									onProductNotFound={onProductNotFound}
									onError={onError}
								/>

								<Button
									onClick={returnToScan}
									variant='outline'
									className='w-full border-neutral-200 text-neutral-700 hover:bg-error-100 hover:border-none'>
									<Camera className='size-4 mr-2' />
									Retour au scan
								</Button>
							</CardContent>
						</Card>
					</div>
				);

			case 'error':
				return (
					<CardContent className='p-6 text-center space-y-4'>
						<Alert className='border-error-50/20 bg-error-50/10'>
							<AlertDescription className='flex flex-col items-center text-neutral-300'>
								<AlertCircle className='size-8 text-error-500 mb-3' />
								<h3 className='text-lg font-semibold mb-2'>
									Problème avec le scanner
								</h3>
								<p className='text-sm text-neutral-200 text-center'>
									{error}
								</p>
							</AlertDescription>
						</Alert>

						<div className='space-y-2'>
							<Button
								onClick={retry}
								className='w-full bg-success-500 text-neutral-50 hover:bg-success-500/90'>
								<Camera className='size-4 mr-2' />
								Réessayer
							</Button>
							<Button
								onClick={switchToManualInput}
								variant='outline'
								className='w-full border-success-500 text-success-500 hover:bg-success-50/10'>
								<Keyboard className='size-4 mr-2' />
								Saisir manuellement
							</Button>
						</div>
					</CardContent>
				);

			case 'searching':
				return (
					<div className='min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6'>
						{/* Bouton fermer en haut à droite */}
						{onClose && (
							<Button
								onClick={onClose}
								size='icon'
								className='absolute top-6 right-6 size-12 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 shadow-lg'>
								<X className='size-5' />
							</Button>
						)}

						<div className='text-center space-y-6'>
							<CheckCircle2 className='size-20 text-success-500 mx-auto animate-pulse' />
							<div className='space-y-2'>
								<h3 className='text-2xl font-bold text-neutral-900'>
									Code-barre détecté !
								</h3>
								<p className='text-neutral-600'>
									Recherche du produit en cours...
								</p>
								{scannedBarcode && (
									<p className='text-sm text-neutral-500 font-mono bg-neutral-100 px-3 py-1 rounded-lg inline-block'>
										{scannedBarcode}
									</p>
								)}
							</div>
							<div className='w-48 h-2 bg-neutral-200 rounded-full mx-auto overflow-hidden'>
								<div className='h-full bg-success-500 rounded-full animate-pulse'></div>
							</div>
						</div>
					</div>
				);

			case 'initializing':
			case 'scanning':
			default:
				// Interface de scan principale
				return (
					<div className='min-h-screen relative bg-neutral-50 flex flex-col items-center justify-center p-6'>
						{/* Bouton fermer en haut à droite */}
						{onClose && (
							<Button
								onClick={onClose}
								size='icon'
								className='absolute top-6 right-6 size-12 rounded-full bg-neutral-100 text-neutral-300 hover:bg-error-100 hover:text-neutral-50 shadow-lg'>
								<X className='size-5' />
							</Button>
						)}

						{/* Titre et instructions */}
						<div className='text-center mb-8'>
							<h2 className='text-2xl font-bold text-neutral-900 mb-2'>
								Scanner un code-barre
							</h2>
							<p className='text-neutral-600'>
								{state === 'initializing'
									? 'Initialisation de la caméra...'
									: 'Centrez le code-barre dans le cadre'}
							</p>
						</div>

						{/* Vidéo dans un carré au centre */}
						<div className='relative mb-8'>
							<div className='size-80 rounded-2xl overflow-hidden bg-neutral-900 shadow-2xl'>
								<video
									ref={videoRef}
									className='size-full object-cover'
									playsInline
									muted
									autoPlay
								/>

								{/* Overlay guide de scan */}
								<div className='absolute inset-0 flex items-center justify-center'>
									<div className='relative'>
										{/* Zone de scan */}
										<div className='size-64 relative'>
											{/* Coins */}
											<div className='absolute -top-1 -left-1 size-8 border-t-4 border-l-4 border-neutral-150 rounded-tl-2xl'></div>
											<div className='absolute -top-1 -right-1 size-8 border-t-4 border-r-4 border-neutral-150 rounded-tr-2xl'></div>
											<div className='absolute -bottom-1 -left-1 size-8 border-b-4 border-l-4 border-neutral-150 rounded-bl-2xl'></div>
											<div className='absolute -bottom-1 -right-1 size-8 border-b-4 border-r-4 border-neutral-150 rounded-br-2xl'></div>

											{/* Ligne de scan animée */}
											<div className='absolute inset-x-0 top-1/2 h-0.5 bg-red-500 animate-pulse shadow-lg shadow-red-500/50'></div>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Boutons de contrôle en dessous */}
						<div className='flex flex-col gap-4'>
							{/* Bouton saisie manuelle */}
							<Button
								onClick={switchToManualInput}
								size='lg'
								variant='outline'
								className='h-14 px-6 rounded-xl border-success-500 text-success-500 hover:bg-success-50 shadow-lg'>
								<Keyboard className='size-5 mr-2' />
								Saisir manuellement le code-barre
							</Button>
						</div>
					</div>
				);
		}
	};

	return (
		<Card
			className={`bg-neutral-50 rounded-2xl shadow-xl overflow-hidden ${className}`}>
			{renderContent()}
		</Card>
	);
};
