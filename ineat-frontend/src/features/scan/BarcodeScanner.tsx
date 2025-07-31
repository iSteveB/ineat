import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
	BrowserMultiFormatReader,
	Result,
	NotFoundException,
} from '@zxing/library';
import {
	CameraOff,
	Flashlight,
	FlashlightOff,
	RotateCcw,
	Keyboard,
	AlertCircle,
	CheckCircle2,
} from 'lucide-react';
import { ManualBarcodeInput } from './ManualBarcodeInput';
import { useOpenFoodFacts } from '@/hooks/useOpenFoodFacts';
import { Product } from '@/schemas/product';

/**
 * États possibles du scanner
 */
type ScannerState =
	| 'idle'
	| 'requesting-permission'
	| 'scanning'
	| 'paused'
	| 'manual-input'
	| 'error';

/**
 * Types d'erreurs du scanner
 */
type ScannerError =
	| 'permission-denied'
	| 'no-camera'
	| 'scanner-error'
	| 'unknown';

/**
 * Props du composant BarcodeScanner
 */
interface BarcodeScannerProps {
	onProductFound: (localProduct: Partial<Product>) => void;
	onProductNotFound: (barcode: string) => void;
	onError?: (error: string) => void;
	onClose?: () => void;
	autoStart?: boolean;
	className?: string;
}

/**
 * Composant de scan de code-barre avec ZXing
 *
 * Fonctionnalités :
 * - Scan via ZXing avec overlay guide
 * - Feedback haptique (vibration)
 * - Bouton torche pour faible luminosité
 * - Fallback saisie manuelle
 * - Gestion permissions caméra
 * - Interface premium avec animations
 *
 * @example
 * ```tsx
 * <BarcodeScanner
 *   onProductFound={(product) => {
 *     setFormData(product);
 *     setShowScanner(false);
 *   }}
 *   onProductNotFound={(barcode) => {
 *     router.push(`/products/create?barcode=${barcode}`);
 *   }}
 *   onClose={() => setShowScanner(false)}
 * />
 * ```
 */
export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
	onProductFound,
	onProductNotFound,
	onError,
	onClose,
	autoStart = true,
	className = '',
}) => {
	// Refs
	const videoRef = useRef<HTMLVideoElement>(null);
	const readerRef = useRef<BrowserMultiFormatReader | null>(null);
	const streamRef = useRef<MediaStream | null>(null);

	// États locaux
	const [state, setState] = useState<ScannerState>('idle');
	const [error, setError] = useState<ScannerError | null>(null);
	const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
	const [hasPermission, setHasPermission] = useState<boolean | null>(null);
	const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
		[]
	);
	const [currentCameraIndex, setCurrentCameraIndex] = useState<number>(0);

	// Hook OpenFoodFacts pour la recherche
	const { searchByBarcode, loading, localProduct, data } = useOpenFoodFacts();

	/**
	 * Demande les permissions caméra
	 */
	const requestCameraPermission = useCallback(async (): Promise<boolean> => {
		try {
			setState('requesting-permission');

			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' }, // Caméra arrière preferée
			});

			// Fermer immédiatement le stream (juste pour tester les permissions)
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
	 * Démarre le scanner
	 */
	const startScanning = useCallback(async (): Promise<void> => {
		if (!hasPermission) {
			const granted = await requestCameraPermission();
			if (!granted) return;
		}

		try {
			setState('scanning');
			setError(null);

			// Initialiser ZXing reader
			if (!readerRef.current) {
				readerRef.current = new BrowserMultiFormatReader();
			}

			await enumerateCameras();

			// Sélectionner la caméra
			const selectedCamera = availableCameras[currentCameraIndex];
			const deviceId = selectedCamera?.deviceId;

			// Démarrer le scan
			const result = await readerRef.current.decodeOnceFromVideoDevice(
				deviceId,
				videoRef.current!
			);

			if (result) {
				handleScanResult(result);
			}
		} catch (err: unknown) {
			console.error('Erreur démarrage scanner:', err);

			if (err instanceof NotFoundException) {
				// Pas de code-barre trouvé, continuer le scan
				return;
			}

			setError('scanner-error');
			setState('error');
		}
	}, [hasPermission, requestCameraPermission, enumerateCameras, availableCameras, currentCameraIndex]);

	/**
	 * Arrête le scanner
	 */
	const stopScanning = useCallback((): void => {
		try {
			// Arrêter ZXing reader
			if (readerRef.current) {
				readerRef.current.reset();
			}

			// Arrêter le stream vidéo
			if (streamRef.current) {
				streamRef.current.getTracks().forEach((track) => track.stop());
				streamRef.current = null;
			}

			// Réinitialiser la torche
			setIsTorchOn(false);
			setState('idle');
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

			// Vibration de feedback
			if ('vibrate' in navigator) {
				navigator.vibrate(200); // 200ms de vibration
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
				setState('scanning'); // Reprendre le scan
				startScanning();
			}
		},
		[searchByBarcode, stopScanning, startScanning, onError]
	);

	/**
	 * Toggle de la torche/flash
	 */
	const toggleTorch = useCallback(async (): Promise<void> => {
		try {
			const stream = streamRef.current;
			if (!stream) return;

			const track = stream.getVideoTracks()[0];
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
			stopScanning();
			setTimeout(() => startScanning(), 100);
		}
	}, [
		availableCameras,
		currentCameraIndex,
		state,
		stopScanning,
		startScanning,
	]);

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
		if (autoStart) {
			startScanning();
		}
	}, [autoStart, startScanning]);

	// Gestion des résultats de recherche
	useEffect(() => {
		if (localProduct && data) {
			onProductFound(localProduct);
		}
	}, [localProduct, data, onProductFound]);

	// Auto-start
	useEffect(() => {
		if (autoStart && state === 'idle') {
			startScanning();
		}
	}, [autoStart, state, startScanning]);

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
				<div className='p-6 space-y-4'>
					<div className='text-center space-y-2'>
						<Keyboard className='size-8 text-blue-600 mx-auto' />
						<h3 className='text-lg font-semibold text-gray-900'>
							Saisie manuelle
						</h3>
						<p className='text-sm text-gray-600'>
							Saisissez le code-barre manuellement
						</p>
					</div>

					<ManualBarcodeInput
						onProductFound={onProductFound}
						onProductNotFound={onProductNotFound}
						onError={onError}
						className='mt-4'
					/>

					<button
						onClick={returnToScan}
						className='w-full px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors'>
						Retour au scan
					</button>
				</div>
			);
		}

		if (state === 'error') {
			return (
				<div className='p-6 text-center space-y-4'>
					<AlertCircle className='size-12 text-red-500 mx-auto' />
					<div>
						<h3 className='text-lg font-semibold text-gray-900 mb-2'>
							{error === 'permission-denied' &&
								'Accès caméra refusé'}
							{error === 'no-camera' && 'Aucune caméra détectée'}
							{error === 'scanner-error' && 'Erreur du scanner'}
							{error === 'unknown' && 'Erreur inconnue'}
						</h3>
						<p className='text-sm text-gray-600 mb-4'>
							{error === 'permission-denied' &&
								"Veuillez autoriser l'accès à la caméra dans les paramètres de votre navigateur."}
							{error === 'no-camera' &&
								"Aucune caméra n'a été trouvée sur cet appareil."}
							{error === 'scanner-error' &&
								'Le scanner a rencontré une erreur technique.'}
							{error === 'unknown' &&
								"Une erreur inattendue s'est produite."}
						</p>
					</div>

					<div className='space-y-2'>
						<button
							onClick={startScanning}
							className='w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'>
							Réessayer
						</button>
						<button
							onClick={switchToManualInput}
							className='w-full px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors'>
							Saisie manuelle
						</button>
					</div>
				</div>
			);
		}

		if (loading) {
			return (
				<div className='p-6 text-center space-y-4'>
					<CheckCircle2 className='size-12 text-green-500 mx-auto' />
					<div>
						<h3 className='text-lg font-semibold text-gray-900'>
							Code-barre détecté !
						</h3>
						<p className='text-sm text-gray-600'>
							Recherche du produit en cours...
						</p>
					</div>
					<div className='animate-pulse bg-gray-200 h-2 rounded'></div>
				</div>
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
				/>

				{/* Overlay guide */}
				<div className='absolute inset-0 flex items-center justify-center'>
					<div className='relative'>
						{/* Zone de scan */}
						<div className='size-64 border-2 border-white rounded-lg relative'>
							<div className='absolute -top-1 -left-1 size-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg'></div>
							<div className='absolute -top-1 -right-1 size-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg'></div>
							<div className='absolute -bottom-1 -left-1 size-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg'></div>
							<div className='absolute -bottom-1 -right-1 size-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg'></div>

							{/* Ligne de scan animée */}
							<div className='absolute inset-x-0 top-1/2 h-0.5 bg-red-500 animate-pulse'></div>
						</div>

						{/* Instructions */}
						<p className='text-white text-center mt-4 text-sm font-medium'>
							Centrez le code-barre dans le cadre
						</p>
					</div>
				</div>

				{/* Contrôles */}
				<div className='absolute bottom-6 left-0 right-0 flex justify-center items-center space-x-4'>
					{/* Torche */}
					<button
						onClick={toggleTorch}
						className={`size-12 rounded-full flex items-center justify-center transition-colors ${
							isTorchOn
								? 'bg-yellow-500 text-black'
								: 'bg-black/50 text-white border border-white/30'
						}`}>
						{isTorchOn ? (
							<FlashlightOff className='size-6' />
						) : (
							<Flashlight className='size-6' />
						)}
					</button>

					{/* Changer de caméra */}
					{availableCameras.length > 1 && (
						<button
							onClick={switchCamera}
							className='size-12 rounded-full bg-black/50 text-white border border-white/30 flex items-center justify-center transition-colors hover:bg-black/70'>
							<RotateCcw className='size-6' />
						</button>
					)}

					{/* Saisie manuelle */}
					<button
						onClick={switchToManualInput}
						className='size-12 rounded-full bg-black/50 text-white border border-white/30 flex items-center justify-center transition-colors hover:bg-black/70'>
						<Keyboard className='size-6' />
					</button>
				</div>

				{/* Bouton fermer */}
				{onClose && (
					<button
						onClick={onClose}
						className='absolute top-4 right-4 size-10 rounded-full bg-black/50 text-white border border-white/30 flex items-center justify-center transition-colors hover:bg-black/70'>
						<CameraOff className='size-5' />
					</button>
				)}
			</div>
		);
	};

	return (
		<div
			className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
			{renderContent()}
		</div>
	);
};
