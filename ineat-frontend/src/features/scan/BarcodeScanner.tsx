import type React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
	BrowserMultiFormatReader,
	type Result,
	NotFoundException,
} from '@zxing/library';
import {
	Keyboard,
	AlertCircle,
	CheckCircle2,
	X,
	Camera,
	Barcode,
	LoaderCircle,
	RotateCcw,
} from 'lucide-react';
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
			} else if (errorMessage.includes('Requested device not found')) {
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
		<div className={`relative min-h-screen bg-neutral-300 ${className}`}>
			{/* Caméra de scan */}
			{(state === 'initializing' ||
				state === 'scanning' ||
				state === 'searching') && (
				<section className='relative min-h-screen overflow-hidden bg-neutral-300'>
					<video
						ref={videoRef}
						className='absolute inset-0 size-full object-cover'
						playsInline
						muted
					/>

					<div className='absolute inset-0 bg-neutral-300/45' />
					<div className='absolute inset-x-0 top-0 h-44 bg-linear-to-b from-neutral-300 via-neutral-300/70 to-transparent' />
					<div className='absolute inset-x-0 bottom-0 h-72 bg-linear-to-t from-neutral-300 via-neutral-300/85 to-transparent' />

					<header className='relative z-10 flex items-center justify-between px-4 pt-5 sm:px-6'>
						<div className='rounded-lg border border-neutral-50/15 bg-neutral-50/12 px-4 py-3 text-neutral-50 shadow-lg backdrop-blur-md'>
							<div className='flex items-center gap-2'>
								<Barcode className='size-5 text-primary-100' />
								<p className='font-semibold'>Scanner un produit</p>
							</div>
							<p className='mt-1 text-xs text-neutral-50/70'>
								Alignez le code-barres dans le cadre
							</p>
						</div>

						{onClose && (
							<Button
								onClick={onClose}
								variant='ghost'
								size='icon'
								className='rounded-full border border-neutral-50/15 bg-neutral-50/12 text-neutral-50 shadow-lg backdrop-blur-md hover:bg-neutral-50/20 hover:text-neutral-50'
								aria-label='Fermer le scanner'>
								<X className='size-5' />
							</Button>
						)}
					</header>

					<div className='relative z-10 flex min-h-screen flex-col justify-center px-5 pb-40 pt-28 sm:px-8'>
						<div className='mx-auto w-full max-w-[360px] sm:max-w-[430px]'>
							<div className='rounded-lg border border-neutral-50/20 bg-neutral-50/10 p-3 shadow-2xl backdrop-blur-sm'>
								<div className='relative h-40 rounded-md border border-neutral-50/35 bg-neutral-300/18 sm:h-48'>
									<div className='absolute -left-1 -top-1 size-10 rounded-tl-md border-l-4 border-t-4 border-primary-100' />
									<div className='absolute -right-1 -top-1 size-10 rounded-tr-md border-r-4 border-t-4 border-primary-100' />
									<div className='absolute -bottom-1 -left-1 size-10 rounded-bl-md border-b-4 border-l-4 border-primary-100' />
									<div className='absolute -bottom-1 -right-1 size-10 rounded-br-md border-b-4 border-r-4 border-primary-100' />

									<div className='absolute left-8 right-8 top-1/2 h-px bg-neutral-50/35' />
									<div className='absolute left-1/2 top-8 bottom-8 w-px bg-neutral-50/25' />

									{state === 'scanning' && (
										<div
											className='absolute left-4 right-4 h-1 rounded-full bg-linear-to-r from-transparent via-primary-100 to-transparent shadow-[0_0_24px_rgba(244,187,95,0.9)]'
											style={{ animation: 'scan 2s linear infinite' }}
										/>
									)}
								</div>
							</div>

							<div className='mx-auto mt-5 max-w-sm rounded-lg border border-neutral-50/15 bg-neutral-50/14 px-4 py-3 text-center text-neutral-50 shadow-lg backdrop-blur-md'>
								<p className='font-semibold'>
									{state === 'initializing' && 'Préparation de la caméra'}
									{state === 'scanning' && 'Placez le code-barres au centre'}
									{state === 'searching' && 'Produit détecté'}
								</p>
								<div className='mt-2 flex items-center justify-center gap-2 text-sm text-neutral-50/75'>
									{state === 'initializing' && (
										<LoaderCircle className='size-4 animate-spin' />
									)}
									{state === 'searching' && (
										<LoaderCircle className='size-4 animate-spin' />
									)}
									<span>
										{state === 'initializing' &&
											'Autorisation et lancement du scan...'}
										{state === 'scanning' &&
											'Gardez le téléphone stable quelques secondes.'}
										{state === 'searching' &&
											'Recherche dans OpenFoodFacts...'}
									</span>
								</div>
							</div>
						</div>
					</div>

					<div className='fixed inset-x-0 bottom-0 z-20 px-4 pb-5 sm:px-6'>
						<div className='mx-auto grid max-w-md grid-cols-1 gap-3 rounded-lg border border-neutral-50/15 bg-neutral-300/80 p-3 shadow-2xl backdrop-blur-xl sm:grid-cols-2'>
							<Button
								onClick={switchToManualInput}
								variant='secondary'
								className='h-12 border-neutral-50/15 bg-neutral-50 text-neutral-300 hover:bg-neutral-100'>
								<Keyboard className='size-4' />
								Saisie manuelle
							</Button>

							{onClose ? (
								<Button
									onClick={onClose}
									variant='ghost'
									className='h-12 border border-neutral-50/15 bg-neutral-50/10 text-neutral-50 hover:bg-neutral-50/20 hover:text-neutral-50'>
									<X className='size-4' />
									Annuler
								</Button>
							) : (
								<Button
									onClick={retry}
									variant='ghost'
									className='h-12 border border-neutral-50/15 bg-neutral-50/10 text-neutral-50 hover:bg-neutral-50/20 hover:text-neutral-50'>
									<RotateCcw className='size-4' />
									Relancer
								</Button>
							)}
						</div>
					</div>
				</section>
			)}

			{/* Mode saisie manuelle */}
			{state === 'manual-input' && (
				<div className='flex min-h-screen items-center justify-center bg-primary-50 px-4 py-8'>
					<Card className='w-full max-w-md border border-neutral-200 bg-neutral-50 shadow-xl'>
						<CardContent className='p-6'>
							<div className='space-y-5'>
							<div className='text-center'>
								<div className='mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-success-50/12 text-success-50'>
									<Keyboard className='size-6' />
								</div>
								<h3 className='mb-2 text-xl font-semibold text-neutral-300'>
									Saisie manuelle
								</h3>
								<p className='text-sm leading-relaxed text-neutral-300/70'>
									Entrez le code-barres si la caméra ne le détecte pas.
								</p>
							</div>

							<ManualBarcodeInput
								onProductFound={onProductFound}
								onProductNotFound={onProductNotFound}
								onError={onError}
							/>

							<div className='grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2'>
								<Button
									onClick={returnToScan}
									variant='primary'
									className='h-11'>
									<Camera className='size-4' />
									Retour au scan
								</Button>
								{onClose && (
									<Button
										onClick={onClose}
										variant='secondary'
										className='h-11'>
										<X className='size-4' />
										Annuler
									</Button>
								)}
							</div>
						</div>
					</CardContent>
				</Card>
				</div>
			)}

			{/* État d'erreur */}
			{state === 'error' && (
				<div className='flex min-h-screen items-center justify-center bg-primary-50 px-4 py-8'>
					<Card className='w-full max-w-md border border-neutral-200 bg-neutral-50 shadow-xl'>
						<CardContent className='p-6'>
							<div className='mb-5 text-center'>
								<div className='mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-error-50/12 text-error-100'>
									<AlertCircle className='size-6' />
								</div>
								<h3 className='text-xl font-semibold text-neutral-300'>
									Caméra indisponible
								</h3>
								<p className='mt-2 text-sm leading-relaxed text-neutral-300/70'>
									Vous pouvez réessayer ou saisir le code-barres à la main.
								</p>
							</div>

							<Alert className='border-error-100/20 bg-error-100/10'>
								<AlertCircle className='size-4 text-error-100' />
								<AlertDescription className='text-neutral-300'>
									{error}
								</AlertDescription>
							</Alert>

							<div className='mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2'>
								<Button onClick={retry} className='h-11'>
									<CheckCircle2 className='size-4' />
									Réessayer
								</Button>

								<Button
									onClick={switchToManualInput}
									variant='secondary'
									className='h-11'>
									<Keyboard className='size-4' />
									Saisie manuelle
								</Button>
							</div>
							{onClose && (
								<Button
									onClick={onClose}
									variant='ghost'
									className='mt-3 h-11 w-full'>
									Annuler
								</Button>
							)}
					</CardContent>
				</Card>
				</div>
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
