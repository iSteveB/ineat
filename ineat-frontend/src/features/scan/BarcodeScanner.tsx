import type React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
	BrowserMultiFormatReader,
	type Result,
	NotFoundException,
} from '@zxing/library';
import {
	Flashlight,
	FlashlightOff,
	RotateCcw,
	Keyboard,
	AlertCircle,
	CheckCircle2,
	X,
} from 'lucide-react';
import { ManualBarcodeInput } from './ManualBarcodeInput';
import { useOpenFoodFacts } from '@/hooks/useOpenFoodFacts';
import type { Product } from '@/schemas/product';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

type ScannerState =
	| 'idle'
	| 'requesting-permission'
	| 'scanning'
	| 'paused'
	| 'manual-input'
	| 'error';

type ScannerError =
	| 'permission-denied'
	| 'no-camera'
	| 'scanner-error'
	| 'unknown';

// Interface pour les contrôles du scanner ZXing
interface ScannerControls {
	stop: () => void;
	stream?: MediaStream;
}

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
	const readerRef = useRef<BrowserMultiFormatReader | null>(null);
	const controlsRef = useRef<ScannerControls | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const isScanningRef = useRef<boolean>(false);

	const [state, setState] = useState<ScannerState>('idle');
	const [error, setError] = useState<ScannerError | null>(null);
	const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
	const [hasPermission, setHasPermission] = useState<boolean | null>(null);
	const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
		[]
	);
	const [currentCameraIndex, setCurrentCameraIndex] = useState<number>(0);
	const [lastScannedCode, setLastScannedCode] = useState<string>('');
	const [scanCooldown, setScanCooldown] = useState<boolean>(false);

	const { searchByBarcode, loading, localProduct, data } = useOpenFoodFacts();

	/**
	 * Demande la permission d'accès à la caméra
	 */
	const requestCameraPermission = useCallback(async (): Promise<boolean> => {
		try {
			setState('requesting-permission');

			// Demander l'accès à la caméra
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' },
			});

			// Fermer immédiatement le stream de test
			stream.getTracks().forEach((track) => track.stop());

			setHasPermission(true);
			return true;
		} catch (err) {
			console.error('Erreur permissions caméra:', err);
			setHasPermission(false);
			setError('permission-denied');
			setState('error');
			return false;
		}
	}, []);

	/**
	 * Énumère les caméras disponibles
	 */
	const enumerateCameras = useCallback(async (): Promise<
		MediaDeviceInfo[]
	> => {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			const cameras = devices.filter(
				(device) => device.kind === 'videoinput'
			);

			setAvailableCameras(cameras);

			// Préférer la caméra arrière si disponible
			const backCameraIndex = cameras.findIndex(
				(camera) =>
					camera.label.toLowerCase().includes('back') ||
					camera.label.toLowerCase().includes('rear') ||
					camera.label.toLowerCase().includes('environment')
			);

			if (backCameraIndex >= 0) {
				setCurrentCameraIndex(backCameraIndex);
			}

			return cameras;
		} catch (err) {
			console.error('Erreur énumération caméras:', err);
			return [];
		}
	}, []);

	/**
	 * Arrête le scanner
	 */
	const stopScanning = useCallback((): void => {
		try {
			isScanningRef.current = false;

			// Arrêter les contrôles ZXing
			if (controlsRef.current) {
				controlsRef.current.stop();
				controlsRef.current = null;
			}

			// Réinitialiser le reader
			if (readerRef.current) {
				readerRef.current.reset();
			}

			// Arrêter le stream vidéo
			if (streamRef.current) {
				streamRef.current.getTracks().forEach((track) => track.stop());
				streamRef.current = null;
			}

			// Réinitialiser la vidéo
			if (videoRef.current) {
				videoRef.current.srcObject = null;
			}

			// Réinitialiser la torche
			setIsTorchOn(false);
			setState('idle');
		} catch (err) {
			console.error('Erreur arrêt scanner:', err);
		}
	}, []);

	/**
	 * Gère le résultat du scan
	 */
	const handleScanResult = useCallback(
		async (result: Result): Promise<void> => {
			// Éviter les scans multiples du même code
			if (scanCooldown || !isScanningRef.current) return;

			const barcode = result.getText();

			// Éviter de scanner le même code plusieurs fois de suite
			if (barcode === lastScannedCode) {
				return;
			}

			// Vibration de feedback
			if ('vibrate' in navigator) {
				navigator.vibrate(200);
			}

			// Activer le cooldown et stocker le code
			setScanCooldown(true);
			setLastScannedCode(barcode);

			// Pauser le scan pendant la recherche
			setState('paused');
			isScanningRef.current = false;

			try {
				// Rechercher dans OpenFoodFacts
				await searchByBarcode(barcode);
			} catch (err) {
				console.error('Erreur recherche produit:', err);
				onError?.('Erreur lors de la recherche du produit');

				// Réactiver le scan après erreur
				setTimeout(() => {
					setScanCooldown(false);
					if (state !== 'manual-input' && state !== 'error') {
						setState('scanning');
					}
				}, 2000);
			}
		},
		[scanCooldown, lastScannedCode, searchByBarcode, onError, state]
	);

	/**
	 * Démarre le scanner
	 */
	const startScanning = useCallback(async (): Promise<void> => {
		// Vérifier si on n'est pas déjà en train de scanner
		if (isScanningRef.current) return;

		if (!hasPermission) {
			const granted = await requestCameraPermission();
			if (!granted) return;
		}

		try {
			setState('scanning');
			setError(null);
			isScanningRef.current = true;

			// Énumérer les caméras d'abord
			const cameras = await enumerateCameras();
			if (cameras.length === 0) {
				throw new Error('Aucune caméra trouvée');
			}

			// Initialiser ZXing reader si nécessaire
			if (!readerRef.current) {
				readerRef.current = new BrowserMultiFormatReader();
			}

			// Sélectionner la caméra
			const selectedCamera = cameras[currentCameraIndex];
			const deviceId = selectedCamera?.deviceId || null;

			// Démarrer le scan continu avec callback
			const controls = await readerRef.current.decodeFromVideoDevice(
				deviceId,
				videoRef.current!,
				(
					result: Result | null,
					error?: Error | undefined,
					controls?: ScannerControls
				) => {
					// Stocker les contrôles
					if (!controlsRef.current && controls) {
						controlsRef.current = controls;
						// Stocker le stream pour la torche
						const stream = controls.stream;
						if (stream) {
							streamRef.current = stream;
						}
					}

					// Traiter le résultat si trouvé
					if (result && isScanningRef.current) {
						handleScanResult(result);
					}

					// Si c'est une NotFoundException, continuer simplement
					if (error && !(error instanceof NotFoundException)) {
						console.error('Erreur scan:', error);
					}
				}
			);

			// Stocker les contrôles
			controlsRef.current = controls as unknown as ScannerControls;

			// Récupérer et stocker le stream
			if (videoRef.current?.srcObject) {
				streamRef.current = videoRef.current.srcObject as MediaStream;
			}
		} catch (err) {
			console.error('Erreur démarrage scanner:', err);
			isScanningRef.current = false;

			if (err instanceof Error) {
				if (err.name === 'NotAllowedError') {
					setError('permission-denied');
				} else if (err.message.includes('caméra')) {
					setError('no-camera');
				} else {
					setError('scanner-error');
				}
			} else {
				setError('unknown');
			}

			setState('error');
			onError?.(err instanceof Error ? err.message : 'Erreur inconnue');
		}
	}, [
		hasPermission,
		requestCameraPermission,
		enumerateCameras,
		currentCameraIndex,
		handleScanResult,
		onError,
	]);

	/**
	 * Toggle de la torche/flash
	 */
	const toggleTorch = useCallback(async (): Promise<void> => {
		try {
			const stream = streamRef.current;
			if (!stream) {
				console.warn('Pas de stream disponible pour la torche');
				return;
			}

			const videoTrack = stream.getVideoTracks()[0];
			if (!videoTrack) {
				console.warn('Pas de piste vidéo disponible');
				return;
			}

			// Vérifier les capacités
			const capabilities =
				videoTrack.getCapabilities() as MediaTrackCapabilities & {
					torch?: boolean;
				};

			if ('torch' in capabilities) {
				await videoTrack.applyConstraints({
					advanced: [
						{ torch: !isTorchOn } as MediaTrackConstraintSet,
					],
				});
				setIsTorchOn(!isTorchOn);
			} else {
				console.warn("La torche n'est pas supportée sur cette caméra");
			}
		} catch (err) {
			console.error('Erreur toggle torche:', err);
		}
	}, [isTorchOn]);

	/**
	 * Change de caméra
	 */
	const switchCamera = useCallback(async (): Promise<void> => {
		if (availableCameras.length <= 1) return;

		const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
		setCurrentCameraIndex(nextIndex);

		// Redémarrer avec la nouvelle caméra
		if (state === 'scanning' || state === 'paused') {
			stopScanning();
			// Attendre un peu avant de redémarrer
			setTimeout(() => {
				setState('scanning');
			}, 100);
		}
	}, [availableCameras, currentCameraIndex, state, stopScanning]);

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
		setScanCooldown(false);
		setLastScannedCode('');
		setState('idle');
		if (autoStart) {
			setTimeout(() => setState('scanning'), 100);
		}
	}, [autoStart]);

	// Effet pour gérer le démarrage du scan
	useEffect(() => {
		if (state === 'scanning' && !isScanningRef.current) {
			startScanning();
		}
	}, [state, startScanning]);

	// Gestion des résultats de recherche
	useEffect(() => {
		if (localProduct && data) {
			onProductFound(localProduct);
			// Réinitialiser après succès
			setScanCooldown(false);
			setLastScannedCode('');
		} else if (!loading && !data && lastScannedCode) {
			onProductNotFound(lastScannedCode);
			// Permettre un nouveau scan après échec
			setTimeout(() => {
				setScanCooldown(false);
				if (state === 'paused') {
					setState('scanning');
				}
			}, 2000);
		}
	}, [
		localProduct,
		data,
		loading,
		lastScannedCode,
		onProductFound,
		onProductNotFound,
		state,
	]);

	// Auto-start
	useEffect(() => {
		if (autoStart && state === 'idle') {
			setState('scanning');
		}
	}, [autoStart, state]);

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
							<AlertCircle className='size-5 text-error-500 mb-2' />
							<h3 className='text-lg font-semibold mb-2'>
								{error === 'permission-denied' &&
									'Accès caméra refusé'}
								{error === 'no-camera' &&
									'Aucune caméra détectée'}
								{error === 'scanner-error' &&
									'Erreur du scanner'}
								{error === 'unknown' && 'Erreur inconnue'}
							</h3>
							<p className='text-sm text-neutral-200'>
								{error === 'permission-denied' &&
									"Veuillez autoriser l'accès à la caméra dans les paramètres de votre navigateur."}
								{error === 'no-camera' &&
									"Aucune caméra n'a été trouvée sur cet appareil."}
								{error === 'scanner-error' &&
									'Le scanner a rencontré une erreur technique. Essayez de recharger la page.'}
								{error === 'unknown' &&
									"Une erreur inattendue s'est produite."}
							</p>
						</AlertDescription>
					</Alert>

					<div className='space-y-2'>
						<Button
							onClick={() => {
								setError(null);
								setState('scanning');
							}}
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
				{/* Vidéo */}
				<video
					ref={videoRef}
					className='size-full object-cover'
					playsInline
					muted
					autoPlay
				/>

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
					{/* Torche */}
					<Button
						onClick={toggleTorch}
						size='icon'
						className={`size-12 rounded-full transition-colors ${
							isTorchOn
								? 'bg-warning-50 text-neutral-300 hover:bg-warning-50/90'
								: 'bg-neutral-300/50 text-neutral-50 border border-neutral-200/30 hover:bg-neutral-300/70'
						}`}>
						{isTorchOn ? (
							<FlashlightOff className='size-6' />
						) : (
							<Flashlight className='size-6' />
						)}
					</Button>

					{/* Changer de caméra */}
					{availableCameras.length > 1 && (
						<Button
							onClick={switchCamera}
							size='icon'
							className='size-12 rounded-full bg-neutral-300/50 text-neutral-50 border border-neutral-200/30 hover:bg-neutral-300/70'>
							<RotateCcw className='size-6' />
						</Button>
					)}

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
			{renderContent()}
		</Card>
	);
};
