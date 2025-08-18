import React from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import AddMethodCard from '@/components/common/AddMethodCard';
import { Scan, Receipt, Car, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { getInitials } from '@/utils/ui-utils';

const AddProductPage: React.FC = () => {
	const navigate = useNavigate();
	const { user } = useAuthStore();

	// TODO: Récupérer le statut premium de l'utilisateur depuis le store
	const isPremiumUser = false;

	const handleOpenScanner = () => {
		navigate({ to: '/app/inventory/add/scan' });
	};

	return (
		<div className='min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30'>
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
