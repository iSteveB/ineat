import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileSearch } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import NavigationBar from '@/components/layout/NavigationBar';

interface Error404Props {
	/** Message d'erreur personnalisé */
	message?: string;
	/** Afficher la barre de recherche */
	showSearch?: boolean;
}

export const Error404Page: React.FC<Error404Props> = ({
	message = 'Désolé, nous ne trouvons pas cette page',
}) => {
	return (
		<div className='min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4 py-8'>
			<div className='w-full max-w-7xl fixed top-0 left-0'>
				<Header />
			</div>
			<div className='max-w-2xl w-full text-center space-y-8'>
				<div className='space-y-6'>
					<div className='flex justify-center'>
						<div className='relative'>
							<div className='size-32 bg-primaire-50 rounded-full flex items-center justify-center'>
								<FileSearch className='size-16 text-primaire-100' />
							</div>
							<div className='absolute -top-2 -right-2 size-8 bg-accent rounded-full opacity-80' />
							<div className='absolute -bottom-3 -left-3 size-6 bg-avertissement-50 rounded-full opacity-60' />
						</div>
					</div>
					<div className='space-y-3'>
						<h1 className='text-6xl font-bold text-accent font-fredoka'>
							404
						</h1>
						<h2 className='text-2xl font-semibold text-neutral-300 font-fredoka'>
							Page non trouvée
						</h2>
						<p className='text-lg text-neutral-200 font-outfit max-w-md mx-auto'>
							{message}. La page que vous recherchez n'existe pas
							ou a été déplacée.
						</p>
					</div>
				</div>

				{/* Lien de retour en arrière */}
				<div className='pt-4'>
					<Button
						variant='ghost'
						onClick={() => window.history.back()}
						className='text-neutral-200 hover:text-neutral-300'>
						<ArrowLeft className='size-4 mr-2' />
						Retour à la page précédente
					</Button>
				</div>
				<NavigationBar />
			</div>
		</div>
	);
};
