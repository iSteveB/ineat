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
import { OpenFoodFactsMapping } from '@/schemas/openfoodfact-mapping';
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
	onProductFound: (product: OpenFoodFactsMapping) => void;
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

	const { searchByBarcode, product, error: offError } = useOpenFoodFacts();

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

				// Rechercher dans OpenFoodFacts avec données enrichies
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

	// Gestion des résultats de recherche OpenFoodFacts ENRICHIS
	useEffect(() => {
		if (state === 'searching') {
			if (product && scannedBarcode) {
				// Produit trouvé avec données enrichies
				console.log('Produit trouvé:', {
					name: product.imageUrl ? 'Avec image' : 'Sans image',
					nutriscore: product.nutriscore,
					ingredients: product.ingredients ? 'Présents' : 'Absents',
					quality: product.quality.completeness,
				});

				onProductFound(product);
			} else if (
				offError &&
				offError.type === 'PRODUCT_NOT_FOUND' &&
				scannedBarcode
			) {
				onProductNotFound(scannedBarcode);
			} else if (offError && offError.type !== 'PRODUCT_NOT_FOUND') {
				// Autres erreurs (réseau, etc.)
				console.error('Erreur OpenFoodFacts:', offError);
				onError?.(offError.message);
			}
		}
	}, [
		state,
		product,
		offError,
		scannedBarcode,
		onProductFound,
		onProductNotFound,
		onError,
	]);

	return (
		<div className={`relative ${className}`}>
			{/* Caméra de scan */}
			{(state === 'initializing' ||
				state === 'scanning' ||
				state === 'searching') && (
				<Card className='relative overflow-hidden border-0 bg-gradient-to-br from-gray-900 to-gray-800 shadow-2xl'>
					<CardContent className='p-0'>
						<div className='relative aspect-[4/3] bg-black rounded-lg overflow-hidden'>
							{/* Élément vidéo */}
							<video
								ref={videoRef}
								className='size-full object-cover'
								playsInline
								muted
							/>

							{/* Overlay de scan */}
							<div className='absolute inset-0 flex items-center justify-center'>
								{/* Zone de scan */}
								<div className='relative'>
									<div className='size-64 border-2 border-white/50 rounded-lg relative'>
										{/* Coins animés */}
										<div className='absolute top-0 left-0 size-8 border-t-4 border-l-4 border-success-50 rounded-tl-lg animate-pulse' />
										<div className='absolute top-0 right-0 size-8 border-t-4 border-r-4 border-success-50 rounded-tr-lg animate-pulse' />
										<div className='absolute bottom-0 left-0 size-8 border-b-4 border-l-4 border-success-50 rounded-bl-lg animate-pulse' />
										<div className='absolute bottom-0 right-0 size-8 border-b-4 border-r-4 border-success-50 rounded-br-lg animate-pulse' />

										{/* Ligne de scan animée */}
										{state === 'scanning' && (
											<div
												className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-success-50 to-transparent animate-pulse'
												style={{
													animation:
														'scan 2s linear infinite',
												}}
											/>
										)}
									</div>

									{/* Instructions */}
									<div className='absolute -bottom-16 left-1/2 -translate-x-1/2 text-center text-white'>
										<p className='text-sm font-medium mb-2'>
											{state === 'initializing' &&
												'Initialisation...'}
											{state === 'scanning' &&
												'Placez le code-barre dans le cadre'}
											{state === 'searching' &&
												'Recherche en cours...'}
										</p>

										{state === 'searching' && (
											<div className='flex items-center justify-center gap-2'>
												<div className='size-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
												<span className='text-xs'>
													Recherche OpenFoodFacts...
												</span>
											</div>
										)}
									</div>
								</div>
							</div>

							{/* Boutons de contrôle */}
							<div className='absolute bottom-4 left-4 right-4 flex justify-center gap-3'>
								<Button
									onClick={switchToManualInput}
									variant='outline'
									size='sm'
									className='bg-white/10 border-white/20 text-white hover:bg-white/20'>
									<Keyboard className='size-4 mr-2' />
									Saisie manuelle
								</Button>

								{onClose && (
									<Button
										onClick={onClose}
										variant='outline'
										size='sm'
										className='bg-white/10 border-white/20 text-white hover:bg-white/20'>
										<X className='size-4 mr-2' />
										Fermer
									</Button>
								)}
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Mode saisie manuelle */}
			{state === 'manual-input' && (
				<Card className='border-0 bg-neutral-50 shadow-xl'>
					<CardContent className='p-6'>
						<div className='space-y-4'>
							<div className='text-center'>
								<h3 className='text-lg font-semibold text-neutral-300 mb-2'>
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
							/>

							<div className='flex justify-center pt-2'>
								<Button
									onClick={returnToScan}
									variant='ghost'
									size='sm'
									className='text-neutral-300 hover:text-neutral-300'>
									<Camera className='size-4 mr-2' />
									Retour au scan
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* État d'erreur */}
			{state === 'error' && (
				<Card className='border-0 bg-neutral-50 shadow-xl'>
					<CardContent className='p-6'>
						<Alert className='border-error-100/20 bg-error-100/10'>
							<AlertCircle className='size-4 text-error-100' />
							<AlertDescription>
								<strong className='text-error-100'>
									Erreur du scanner
								</strong>
								<br />
								{error}
							</AlertDescription>
						</Alert>

						<div className='flex justify-center gap-3 mt-4'>
							<Button
								onClick={retry}
								variant='outline'
								size='sm'
								className='border-success-50 text-success-50 hover:bg-success-50/10'>
								<CheckCircle2 className='size-4 mr-2' />
								Réessayer
							</Button>

							<Button
								onClick={switchToManualInput}
								variant='outline'
								size='sm'>
								<Keyboard className='size-4 mr-2' />
								Saisie manuelle
							</Button>

							{onClose && (
								<Button
									onClick={onClose}
									variant='ghost'
									size='sm'>
									Fermer
								</Button>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Styles CSS pour l'animation de scan */}
			<style>{`
				@keyframes scan {
					0% { top: 0; }
					50% { top: 100%; }
					100% { top: 0; }
				}
			`}</style>
		</div>
	);
};
