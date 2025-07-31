import React, { useState } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { AddMethodCard } from '@/components/common/AddMethodCard';
import { ProductScanFlow } from '@/features/scan/ProductScanFlow';
import { Scan, Receipt, Car, ShoppingCart, ArrowLeft } from 'lucide-react';

export const AddProductPage: React.FC = () => {
	const router = useRouter();

	// État pour gérer l'ouverture du scanner
	const [showScanner, setShowScanner] = useState<boolean>(false);

	// TODO: Récupérer le statut premium de l'utilisateur depuis le store
	const isPremiumUser = false; // Placeholder

	/**
	 * Gère l'ouverture du scanner
	 */
	const handleOpenScanner = () => {
		setShowScanner(true);
	};

	/**
	 * Gère la fermeture du scanner
	 */
	const handleCloseScanner = () => {
		setShowScanner(false);
	};

	/**
	 * Gère la fin du processus de scan (produit ajouté)
	 */
	const handleScanComplete = () => {
		setShowScanner(false);
		// Redirection vers l'inventaire
		router.navigate({ to: '/app/inventory' });
	};

	// Interface du scanner en plein écran
	if (showScanner) {
		return (
			<div className='fixed inset-0 z-50 bg-black'>
				<ProductScanFlow
					onComplete={handleScanComplete}
					onCancel={handleCloseScanner}
					className='size-full'
				/>
			</div>
		);
	}

	// Interface normale de sélection de méthode
	return (
		<div className='min-h-screen bg-neutral-50'>
			{/* Header */}
			<div className='bg-neutral-50 border-b border-neutral-100'>
				<div className='max-w-md mx-auto px-4 py-4'>
					<div className='flex items-center space-x-4'>
						<Link
							to='/app/inventory'
							className='p-2 hover:bg-neutral-100 rounded-full transition-colors'>
							<ArrowLeft className='size-5 text-neutral-300' />
						</Link>

						<div className='flex items-center space-x-3'>
							<div className='size-12 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden'>
								{/* Avatar utilisateur - remplacer par l'avatar réel */}
								<div className='size-10 bg-neutral-300 rounded-full'></div>
							</div>
							<h1 className="text-xl font-semibold text-neutral-300 font-['Fredoka']">
								Ajouter un produit
							</h1>
						</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className='max-w-md mx-auto px-4 py-6'>
				<h2 className='text-lg font-semibold text-neutral-300 mb-6'>
					Choisir une méthode d'ajout
				</h2>

				<div className='space-y-4'>
					{/* Scanner un code-barre - MISE À JOUR */}
					<div onClick={handleOpenScanner} className='cursor-pointer'>
						<AddMethodCard
							icon={<Scan className='size-6 text-neutral-300' />}
							title='Scanner un code-barre'
							description="Scanner directement le code-barre d'un produit avec recherche automatique OpenFoodFacts."
							to={''} // Pas de 'to' car on gère le clic manuellement
						/>
					</div>

					{/* Scanner un ticket de caisse */}
					<AddMethodCard
						icon={<Receipt className='size-6 text-neutral-300' />}
						title='Scanner un ticket de caisse'
						description='Scanner un ticket de caisse pour ajouter des articles.'
						to={
							isPremiumUser
								? '/app/inventory/add/receipt'
								: '/app/upgrade'
						}
						isPremium={true}
						isDisabled={!isPremiumUser}
					/>

					{/* Importer une facture Drive */}
					<AddMethodCard
						icon={<Car className='size-6 text-neutral-300' />}
						title='Importer une facture Drive'
						description='Importer vos achats depuis une facture Drive.'
						to={
							isPremiumUser
								? '/app/inventory/add/drive'
								: '/app/upgrade'
						}
						isPremium={true}
						isDisabled={!isPremiumUser}
					/>

					{/* Ajouter manuellement */}
					<AddMethodCard
						icon={
							<ShoppingCart className='size-6 text-neutral-300' />
						}
						title='Ajout manuel'
						description='Entrer manuellement les détails du produit.'
						to='/app/inventory/add/search'
					/>
				</div>

				{/* Note d'information sur OpenFoodFacts */}
				<div className='mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg'>
					<div className='flex items-start space-x-3'>
						<Scan className='size-5 text-blue-600 mt-0.5 flex-shrink-0' />
						<div>
							<h3 className='text-sm font-medium text-blue-800 mb-1'>
								Scanner pour gagner du temps
							</h3>
							<p className='text-xs text-blue-700'>
								Le scanner récupère automatiquement le nom, la
								marque et les informations nutritionnelles
								depuis la base de données OpenFoodFacts. Vous
								n'avez plus qu'à ajouter le prix et la date de
								péremption !
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
