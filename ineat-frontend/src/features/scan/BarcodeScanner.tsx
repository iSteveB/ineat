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
	const streamRef = useRef<MediaStream | null>(null);
	const scanControlsRef = useRef<{ stop: () => void } | null>(null);

	const [state, setState] = useState<ScannerState>('idle');
	const [error, setError] = useState<ScannerError | null>(null);
	const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
	const [hasPermission, setHasPermission] = useState<boolean | null>(null);
	const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
		[]
	);
	const [currentCameraIndex, setCurrentCameraIndex] = useState<number>(0);

	const { searchByBarcode, loading, localProduct, data } = useOpenFoodFacts();

	/**
	 * Demande l'autorisation d'accès à la caméra
	 */
	const requestCameraPermission = useCallback(async (): Promise<boolean> => {
		try {
			setState('requesting-permission');

			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' },
			});

			// Fermer immédiatement le stream de test
			stream.getTracks().forEach((track) => track.stop());

			setHasPermission(true);
			return true;
		} catch (err: unknown) {
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
	const enumerateCameras = useCallback(async (): Promise<void> => {
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
		} catch (err: unknown) {
			console.error('Erreur énumération caméras:', err);
		}
	}, []);

	/**
	 * Arrête le scanner
	 */
	const stopScanning = useCallback((): void => {
		try {
			// Arrêter les contrôles de scan ZXing
			if (scanControlsRef.current) {
				scanControlsRef.current.stop();
				scanControlsRef.current = null;
			}

			// Réinitialiser ZXing reader
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
		} catch (err: unknown) {
			console.error('Erreur arrêt scanner:', err);
		}
	}, []);

	/**
	 * Gère le résultat du scan
	 */
	const handleScanResult = useCallback(
		async (result: Result): Promise<void> => {
			const barcode = result.getText();
			console.log('Code-barre détecté:', barcode);

			// Vibration de feedback
			if ('vibrate' in navigator) {
				navigator.vibrate(200);
			}

			// Pauser le scan pendant la recherche
			setState('paused');
			stopScanning();

			try {
				// Rechercher dans OpenFoodFacts
				await searchByBarcode(barcode);
			} catch (err: unknown) {
				console.error('Erreur recherche produit:', err);
				onError?.('Erreur lors de la recherche du produit');
				// Redémarrer le scan en cas d'erreur
				setState('scanning');
			}
		},
		[searchByBarcode, stopScanning, onError]
	);

	/**
	 * Démarre le scanner
	 */
	const startScanning = useCallback(async (): Promise<void> => {
		// Vérifier les permissions
		if (!hasPermission) {
			const granted = await requestCameraPermission();
			if (!granted) return;
		}

		try {
			setState('scanning');
			setError(null);

			// Arrêter tout scan existant
			stopScanning();

			// Initialiser ZXing reader
			if (!readerRef.current) {
				readerRef.current = new BrowserMultiFormatReader();
			}

			// Énumérer les caméras
			await enumerateCameras();

			// Attendre que les caméras soient disponibles
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Sélectionner la caméra
			let deviceId: string | undefined;
			if (availableCameras.length > 0) {
				const selectedCamera = availableCameras[currentCameraIndex];
				deviceId = selectedCamera?.deviceId;
			}

			// Configurer les contraintes vidéo
			const constraints: MediaStreamConstraints = {
				video: deviceId
					? { deviceId: { exact: deviceId } }
					: { facingMode: 'environment' },
			};

			// Obtenir le stream
			const stream = await navigator.mediaDevices.getUserMedia(
				constraints
			);
			streamRef.current = stream;

			// Configurer la vidéo
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
			}

			// Démarrer le scan continu
			const controls = await readerRef.current.decodeFromVideoDevice(
				deviceId || null,
				videoRef.current!,
				(result: Result | null, error?: Error) => {
					if (result) {
						handleScanResult(result);
					} else if (error && !(error instanceof NotFoundException)) {
						console.error('Erreur scan:', error);
						// Ne pas considérer NotFoundException comme une erreur
						// car elle est levée quand aucun code-barre n'est trouvé
					}
				}
			);

			scanControlsRef.current = { stop: () => controls };
		} catch (err: unknown) {
			console.error('Erreur démarrage scanner:', err);
			setError('scanner-error');
			setState('error');
		}
	}, [
		hasPermission,
		requestCameraPermission,
		stopScanning,
		enumerateCameras,
		availableCameras,
		currentCameraIndex,
		handleScanResult,
	]);

	/**
	 * Toggle de la torche/flash
	 */
	const toggleTorch = useCallback(async (): Promise<void> => {
		try {
			const stream = streamRef.current;
			if (!stream) return;

			const track = stream.getVideoTracks()[0];
			if (!track) return;

			const capabilities = track.getCapabilities();

			if ('torch' in capabilities) {
				await track.applyConstraints({
					advanced: [{ torch: !isTorchOn } as MediaTrackConstraints],
				});
				setIsTorchOn(!isTorchOn);
			}
		} catch (err: unknown) {
			console.error('Erreur toggle torche:', err);
		}
	}, [isTorchOn]);

	/**
	 * Change de caméra
	 */
	const switchCamera = useCallback((): void => {
		if (availableCameras.length <= 1) return;

		const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
		setCurrentCameraIndex(nextIndex);

		// Redémarrer avec la nouvelle caméra
		if (state === 'scanning') {
			startScanning();
		}
	}, [availableCameras, currentCameraIndex, state, startScanning]);

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
		setState('scanning');
	}, []);

	// Effet pour démarrer le scan
	useEffect(() => {
		if (state === 'scanning') {
			startScanning();
		}
	}, [state, startScanning]);

	// Gestion des résultats de recherche
	useEffect(() => {
		if (localProduct && data) {
			onProductFound(localProduct);
		}
	}, [localProduct, data, onProductFound]);

	// Auto-start
	useEffect(() => {
		if (autoStart && state === 'idle') {
			setState('scanning');
		}
	}, [autoStart, state]);

	// Cleanup au démontage
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
								{error === 'permission-denied' &&
									'Accès caméra refusé'}
								{error === 'no-camera' &&
									'Aucune caméra détectée'}
								{error === 'scanner-error' &&
									'Erreur du scanner'}
								{error === 'unknown' && 'Erreur inconnue'}
							</h3>
							<p className='text-sm text-neutral-200 mb-4'>
								{error === 'permission-denied' &&
									"Veuillez autoriser l'accès à la caméra dans les paramètres de votre navigateur."}
								{error === 'no-camera' &&
									"Aucune caméra n'a été trouvée sur cet appareil."}
								{error === 'scanner-error' &&
									'Le scanner a rencontré une erreur technique. Essayez de redémarrer la caméra.'}
								{error === 'unknown' &&
									"Une erreur inattendue s'est produite."}
							</p>
						</AlertDescription>
					</Alert>

					<div className='space-y-2'>
						<Button
							onClick={() => setState('scanning')}
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

		if (state === 'requesting-permission') {
			return (
				<CardContent className='p-6 text-center space-y-4'>
					<div className='animate-spin rounded-full size-12 border-4 border-primary-500 border-t-transparent mx-auto'></div>
					<div>
						<h3 className='text-lg font-semibold text-neutral-300'>
							Demande d'autorisation
						</h3>
						<p className='text-sm text-neutral-200'>
							Veuillez autoriser l'accès à la caméra
						</p>
					</div>
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
