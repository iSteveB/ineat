import type { FC } from 'react';
import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ProductScanFlow } from '@/features/scan/ProductScanFlow';
import { useNavigationStore } from '@/stores/navigationStore';

const ScannerPage: FC = () => {
	const navigate = useNavigate();
	const { hideNavigation, showNavigation } = useNavigationStore();

	// Masquer la navigation au montage et la remettre au démontage
	useEffect(() => {
		hideNavigation();

		return () => {
			showNavigation();
		};
	}, [hideNavigation, showNavigation]);

	/**
	 * Gestionnaire de succès : retourne à l'inventaire après ajout réussi
	 */
	const handleScanComplete = (): void => {
		navigate({ to: '/app/inventory' });
	};

	/**
	 * Gestionnaire d'annulation : retourne à la page de sélection des méthodes d'ajout
	 */
	const handleScanCancel = (): void => {
		navigate({ to: '/app/inventory/add' });
	};

	return (
		<div className='inset-0 bg-neutral-50 z-50'>
			<ProductScanFlow
				onComplete={handleScanComplete}
				onCancel={handleScanCancel}
				defaultStep='scan'
				className='size-full'
			/>
		</div>
	);
};

export default ScannerPage;
