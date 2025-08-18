import type { FC } from 'react';
import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { BarcodeScanner } from '@/features/scan/BarcodeScanner';
import { useNavigationStore } from '@/stores/navigationStore';
import type { Product } from '@/schemas/product';

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

	const handleProductFound = (localProduct: Partial<Product>) => {
		// Naviguer vers la page d'ajout de produit avec les données pré-remplies
		navigate({
			to: '/app/inventory/add/manual',
			search: {
				productData: JSON.stringify(localProduct),
			},
		});
	};

	const handleProductNotFound = (barcode: string) => {
		// Naviguer vers la page d'ajout manuel avec le code-barre
		navigate({
			to: '/app/inventory/add/manual',
			search: {
				barcode,
			},
		});
	};

	const handleError = (error: string) => {
		console.error('Erreur scanner:', error);
		// Optionnel : afficher une notification d'erreur
	};

	const handleClose = () => {
		// Retourner à la page précédente ou à la page d'ajout
		navigate({ to: '/app/inventory/add' });
	};

	return (
		<div className='fixed inset-0 bg-black z-50'>
			<BarcodeScanner
				onProductFound={handleProductFound}
				onProductNotFound={handleProductNotFound}
				onError={handleError}
				onClose={handleClose}
				autoStart={true}
				className='size-full rounded-none'
			/>
		</div>
	);
};

export default ScannerPage;
