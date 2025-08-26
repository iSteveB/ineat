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
	Flashlight,
	FlashlightOff,
} from 'lucide-react';
import { ManualBarcodeInput } from './ManualBarcodeInput';
import { useOpenFoodFacts } from '@/hooks/useOpenFoodFacts';
import type { Product } from '@/schemas/product';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

//Types personnalisés pour l'API Torch (non standard dans TypeScript)
interface ExtendedMediaTrackSupportedConstraints
	extends MediaTrackSupportedConstraints {
	torch?: boolean;
}

interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
	torch?: boolean;
}

interface ExtendedMediaTrackConstraintSet extends MediaTrackConstraintSet {
	torch?: boolean;
}

interface ExtendedMediaTrackConstraints extends MediaTrackConstraints {
	torch?: boolean;
	advanced?: ExtendedMediaTrackConstraintSet[];
}

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

	const [isFlashOn, setIsFlashOn] = useState<boolean>(false);
	const [isFlashSupported, setIsFlashSupported] = useState<boolean>(false);
	const [isFlashLoading, setIsFlashLoading] = useState<boolean>(false);

	const {
		searchByBarcode,
		localProduct,
		data,
		error: offError,
	} = useOpenFoodFacts();

	/**
	 * Vérifie si le flash/torche est supporté
	 */
	const checkFlashSupport = useCallback((): void => {
		try {
			const constraints =
				navigator.mediaDevices?.getSupportedConstraints() as ExtendedMediaTrackSupportedConstraints;
			const torchSupported = constraints?.torch === true;
			setIsFlashSupported(torchSupported);
			console.log('Support flash/torche:', torchSupported);
		} catch (error) {
			console.log('Impossible de vérifier le support flash:', error);
			setIsFlashSupported(false);
		}
	}, []);

	/**
	 * Contrôle du flash/torche
	 */
	const toggleFlash = useCallback(async (): Promise<void> => {
		if (!isFlashSupported || !streamRef.current) return;

		setIsFlashLoading(true);

		try {
			const track = streamRef.current.getVideoTracks()[0];
			if (!track) {
				throw new Error('Aucune piste vidéo disponible');
			}

			// Vérifier les capacités de la piste avec type safety
			const capabilities =
				track.getCapabilities() as ExtendedMediaTrackCapabilities;
			if (!capabilities.torch) {
				throw new Error('Flash non supporté par cette caméra');
			}

			// Appliquer la contrainte torche avec type safety
			const constraints: ExtendedMediaTrackConstraints = {
				advanced: [{ torch: !isFlashOn }],
			};

			await track.applyConstraints(constraints);

			setIsFlashOn(!isFlashOn);
			console.log('Flash', !isFlashOn ? 'activé' : 'désactivé');
		} catch (err: unknown) {
			console.error('Erreur contrôle flash:', err);
			const message =
				err instanceof Error ? err.message : 'Erreur inconnue';

			// Ne pas afficher d'erreur pour les cas où le flash n'est simplement pas disponible
			if (
				!message.includes('not supported') &&
				!message.includes('non supporté')
			) {
				onError?.(`Erreur flash: ${message}`);
			}
		} finally {
			setIsFlashLoading(false);
		}
	}, [isFlashSupported, isFlashOn, onError]);

	/**
	 * Arrête le scanner proprement
	 */
	const stopScanning = useCallback((): void => {
		try {
			// Éteindre le flash avant d'arrêter
			if (isFlashOn && streamRef.current) {
				const track = streamRef.current.getVideoTracks()[0];
				if (track) {
					const constraints: ExtendedMediaTrackConstraints = {
						advanced: [{ torch: false }],
					};
					track.applyConstraints(constraints).catch(console.error);
				}
			}

			if (codeReaderRef.current) {
				codeReaderRef.current.reset();
			}

			streamRef.current = null;
			isInitializedRef.current = false;
			setIsFlashOn(false);
		} catch (err: unknown) {
			console.error('Erreur arrêt scanner:', err);
		}
	}, [isFlashOn]);

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

			// Vérifier le support du flash
			checkFlashSupport();

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

			// Vérifier à nouveau le support du flash avec la vraie piste
			const videoTrack = stream.getVideoTracks()[0];
			if (videoTrack) {
				const capabilities =
					videoTrack.getCapabilities() as ExtendedMediaTrackCapabilities;
				setIsFlashSupported(!!capabilities.torch);
			}

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
	}, [handleScanResult, handleScannerError, checkFlashSupport]);

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
					<CardContent className='p-6 space-y-4'>
						<div className='text-center space-y-2'>
							<Keyboard className='size-8 text-accent mx-auto' />
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
							className='w-full border-accent text-accent hover:bg-accent/10'>
							<Camera className='size-4 mr-2' />
							Retour au scan
						</Button>
					</CardContent>
				);

			case 'error':
				return (
					<CardContent className='p-6 text-center space-y-4'>
						<Alert className='border-error-50/20 bg-error-50/10'>
							<AlertDescription className='flex flex-col items-center text-neutral-300'>
								<AlertCircle className='size-8 text-error-50 mb-3' />
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
								className='w-full bg-accent text-neutral-50 hover:bg-accent/90'>
								<Camera className='size-4 mr-2' />
								Réessayer
							</Button>
							<Button
								onClick={switchToManualInput}
								variant='outline'
								className='w-full border-accent text-accent hover:bg-accent/10'>
								<Keyboard className='size-4 mr-2' />
								Saisir manuellement
							</Button>
						</div>
					</CardContent>
				);

			case 'searching':
				return (
					<div className='relative size-full bg-neutral-950 flex items-center justify-center'>
						<div className='text-center space-y-4'>
							<CheckCircle2 className='size-16 text-success-500 mx-auto animate-pulse' />
							<div>
								<h3 className='text-xl font-semibold text-neutral-50'>
									Code-barre détecté !
								</h3>
								<p className='text-sm text-neutral-200 mt-2'>
									Recherche du produit en cours...
								</p>
								{scannedBarcode && (
									<p className='text-xs text-neutral-400 mt-2 font-mono'>
										{scannedBarcode}
									</p>
								)}
							</div>
							<div className='w-32 h-1 bg-neutral-800 rounded-full mx-auto overflow-hidden'>
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
					<div className='relative size-full bg-neutral-950'>
						{/* Vidéo */}
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
								<div className='size-64 border-2 border-neutral-50 rounded-2xl relative'>
									{/* Coins animés */}
									<div className='absolute -top-1 -left-1 size-8 border-t-4 border-l-4 border-accent rounded-tl-2xl animate-pulse'></div>
									<div className='absolute -top-1 -right-1 size-8 border-t-4 border-r-4 border-accent rounded-tr-2xl animate-pulse'></div>
									<div className='absolute -bottom-1 -left-1 size-8 border-b-4 border-l-4 border-accent rounded-bl-2xl animate-pulse'></div>
									<div className='absolute -bottom-1 -right-1 size-8 border-b-4 border-r-4 border-accent rounded-br-2xl animate-pulse'></div>

									{/* Ligne de scan animée */}
									<div className='absolute inset-x-0 top-1/2 h-0.5 bg-accent animate-pulse shadow-lg shadow-accent/50'></div>
								</div>

								{/* Instructions */}
								<div className='text-center mt-6 space-y-2'>
									<p className='text-neutral-50 text-lg font-medium'>
										Centrez le code-barre dans le cadre
									</p>
									<p className='text-neutral-200 text-sm'>
										{state === 'initializing'
											? 'Initialisation...'
											: 'Scan en cours...'}
									</p>
								</div>
							</div>
						</div>

						{/* ✅ NOUVEAU : Contrôles en bas avec flash */}
						<div className='absolute bottom-8 left-0 right-0 flex justify-center items-center gap-4'>
							{/* Bouton flash */}
							{isFlashSupported && (
								<Button
									onClick={toggleFlash}
									disabled={isFlashLoading}
									size='lg'
									className={`size-14 rounded-full border border-neutral-200/30 backdrop-blur-sm transition-colors ${
										isFlashOn
											? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
											: 'bg-neutral-50/10 text-neutral-50 hover:bg-neutral-50/20'
									}`}>
									{isFlashLoading ? (
										<div className='size-6 border-2 border-current border-t-transparent rounded-full animate-spin' />
									) : isFlashOn ? (
										<Flashlight className='size-6' />
									) : (
										<FlashlightOff className='size-6' />
									)}
								</Button>
							)}

							{/* Bouton saisie manuelle */}
							<Button
								onClick={switchToManualInput}
								size='lg'
								className='size-14 rounded-full bg-neutral-50/10 text-neutral-50 border border-neutral-200/30 hover:bg-neutral-50/20 backdrop-blur-sm'>
								<Keyboard className='size-6' />
							</Button>
						</div>

						{/* Bouton fermer */}
						{onClose && (
							<Button
								onClick={onClose}
								size='icon'
								className='absolute top-6 right-6 size-12 rounded-full bg-neutral-50/10 text-neutral-50 border border-neutral-200/30 hover:bg-neutral-50/20 backdrop-blur-sm'>
								<X className='size-5' />
							</Button>
						)}
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
