import React from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, FileText, PencilLine, ScanLine } from 'lucide-react';

import AddMethodCard from '@/components/common/AddMethodCard';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

const AddProductPage: React.FC = () => {
	const { user } = useAuthStore();

	const hasDriveAccess = Boolean(user?.capabilities.canImportDrive);
	const driveImportsRemaining = user?.capabilities.driveImportsRemaining ?? 0;
	const canImportDrive = hasDriveAccess && driveImportsRemaining > 0;
	const driveBlockedMessage = hasDriveAccess
		? 'Quota atteint : le prochain import sera disponible au renouvellement.'
		: 'Analyse automatique de vos factures Drive, avec Premium.';

	return (
		<div className='mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4 sm:px-6 lg:py-6'>
			<Button asChild variant='ghost' className='-ml-3 self-start'>
				<Link to='/app/inventory'>
					<ArrowLeft aria-hidden='true' />
					Inventaire
				</Link>
			</Button>

			<header>
				<h1 className='type-h1 text-neutral-900'>Ajouter un produit</h1>
				<p className='text-neutral-600'>Choisissez comment ajouter vos courses.</p>
			</header>

			<ul className='flex flex-col gap-3'>
				<li>
					<AddMethodCard
						icon={<ScanLine className='size-6' aria-hidden='true' />}
						title='Scanner un code-barre'
						description='Le plus rapide : nom, Nutri-Score et date estimée sont remplis automatiquement.'
						to='/app/inventory/add/scan'
						isRecommended
					/>
				</li>
				<li>
					<AddMethodCard
						icon={<PencilLine className='size-6' aria-hidden='true' />}
						title='Ajout manuel'
						description='Recherchez un produit par son nom ou saisissez ses informations.'
						to='/app/inventory/add/search'
					/>
				</li>
				<li>
					<AddMethodCard
						icon={<FileText className='size-6' aria-hidden='true' />}
						title='Importer une facture Drive'
						description={
							canImportDrive
								? `Analyse de votre facture Drive pour tout ajouter d’un coup. ${driveImportsRemaining} import${driveImportsRemaining > 1 ? 's' : ''} restant${driveImportsRemaining > 1 ? 's' : ''}.`
								: driveBlockedMessage
						}
						to={canImportDrive ? '/app/inventory/add/drive' : '/app/subscription'}
						isPremium={!hasDriveAccess}
					/>
				</li>
			</ul>
		</div>
	);
};

export default AddProductPage;
