import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Scan, Receipt, Car, ShoppingCart, ArrowLeft } from 'lucide-react';
import AddMethodCard from '@/components/common/AddMethodCard';
import { ProductScanFlow } from '@/features/scan/ProductScanFlow';
import { useAuthStore } from '@/stores/authStore';
import type { Product } from '@/schemas/product';
import { z } from 'zod';

// Schéma pour valider les paramètres de recherche
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const searchSchema = z.object({
	productData: z.string().optional(), // JSON stringifié des données du produit
});

type SearchParams = z.infer<typeof searchSchema>;

type ProductData = Partial<Product>;

const AddProductPage: React.FC = () => {
	const navigate = useNavigate();
	const { user } = useAuthStore();

	// CORRECTION: Récupérer les paramètres de recherche avec le bon type
	const searchParams = useSearch({
		from: '/app/inventory/add/',
	}) as SearchParams;

	const [showScanFlow, setShowScanFlow] = useState<boolean>(false);
	const [productData, setProductData] = useState<ProductData | null>(null);

	const isPremiumUser = user?.subscription === 'PREMIUM';

	// Utilitaire pour obtenir les initiales
	const getInitials = (firstName: string, lastName: string): string => {
		return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
	};

	// Effet pour détecter et traiter les données de produit scannées
	useEffect(() => {
		if (searchParams.productData) {
			try {
				const parsedProductData: ProductData = JSON.parse(
					searchParams.productData
				);
				console.log('Données produit reçues:', parsedProductData);
				setProductData(parsedProductData);
				setShowScanFlow(true);
			} catch (error) {
				console.error(
					'Erreur lors du parsing des données produit:',
					error
				);
				// En cas d'erreur, on nettoie l'URL et on reste sur la page normale
				navigate({ to: '/app/inventory/add' });
			}
		}
	}, [searchParams.productData, navigate]);

	// Gestionnaire pour ouvrir le scanner
	const handleOpenScanner = (): void => {
		navigate({ to: '/app/inventory/add/scan' });
	};

	// Gestionnaire de succès du flow de scan
	const handleScanFlowComplete = (): void => {
		setShowScanFlow(false);
		setProductData(null);
		navigate({ to: '/app/inventory' });
	};

	// Gestionnaire d'annulation du flow de scan
	const handleScanFlowCancel = (): void => {
		setShowScanFlow(false);
		setProductData(null);
		// Nettoyer l'URL des paramètres
		navigate({ to: '/app/inventory/add' });
	};

	// Si on a des données de produit et qu'on doit afficher le flow de scan
	if (showScanFlow && productData) {
		return (
			<div className='min-h-screen bg-neutral-50'>
				<ProductScanFlow
					onComplete={handleScanFlowComplete}
					onCancel={handleScanFlowCancel}
					defaultStep='form' // Commencer directement par le formulaire
					initialProductData={productData} // Passer les données de produit
					className='size-full'
				/>
			</div>
		);
	}

	// Interface normale de sélection de méthode
	return (
		<div className='min-h-screen bg-neutral-50'>
			{/* Header */}
			<div className='bg-neutral-50 border-b border-gray-200 shadow-sm'>
				<div className='max-w-md mx-auto px-4 py-4'>
					<div className='flex items-center space-x-4'>
						<Link
							to='/app/inventory'
							className='p-2 hover:bg-gray-100 rounded-full transition-colors'>
							<ArrowLeft className='size-5 text-gray-600' />
						</Link>

						<div className='flex items-center space-x-3'>
							<div className='size-12 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary-100/50 to-primary-100 shadow-lg'>
								{user?.avatarUrl ? (
									<img
										src={
											user.avatarUrl || '/placeholder.svg'
										}
										alt='Avatar utilisateur'
										className='size-full object-cover'
									/>
								) : (
									<div className='flex items-center justify-center size-full text-neutral-50 text-xl font-semibold'>
										{getInitials(
											user?.firstName || '',
											user?.lastName || ''
										)}
									</div>
								)}
							</div>
							<h1 className="text-xl font-semibold text-gray-900 font-['Fredoka']">
								Ajouter un produit
							</h1>
						</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className='max-w-md mx-auto px-4 py-6'>
				<h2 className='text-lg font-semibold text-gray-900 mb-6'>
					Choisir une méthode d'ajout
				</h2>

				<div className='space-y-4'>
					{/* Scanner un code-barre */}
					<div onClick={handleOpenScanner} className='cursor-pointer'>
						<AddMethodCard
							icon={<Scan className='size-6 text-blue-600' />}
							title='Scanner un code-barre'
							description="Scanner directement le code-barre d'un produit avec recherche automatique OpenFoodFacts."
							to={''} // Pas de 'to' car on gère le clic manuellement
						/>
					</div>

					{/* Scanner un ticket de caisse */}
					<AddMethodCard
						icon={<Receipt className='size-6 text-blue-600' />}
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
						icon={<Car className='size-6 text-blue-600' />}
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
						icon={<ShoppingCart className='size-6 text-blue-600' />}
						title='Ajout manuel'
						description='Entrer manuellement les détails du produit.'
						to='/app/inventory/add/search'
					/>
				</div>
			</div>
		</div>
	);
};

export default AddProductPage;
