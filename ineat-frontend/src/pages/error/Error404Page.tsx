import React from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
	Home,
	Search,
	ArrowLeft,
	ShoppingCart,
	Package2,
	ChefHat,
	Euro,
} from 'lucide-react';

interface Error404Props {
	/** Message d'erreur personnalisé */
	message?: string;
	/** Afficher la barre de recherche */
	showSearch?: boolean;
	/** Actions rapides à afficher */
	quickActions?: boolean;
}

export const Error404Page: React.FC<Error404Props> = ({
	message = 'Désolé, nous ne trouvons pas cette page',
	showSearch = true,
	quickActions = true,
}) => {
	const [searchQuery, setSearchQuery] = React.useState<string>('');

	const handleSearch = (event: React.FormEvent<HTMLFormElement>): void => {
		event.preventDefault();
		if (searchQuery.trim()) {
			// Navigation vers la page de recherche avec le terme
			// À adapter selon votre système de routing
			console.log('Recherche:', searchQuery);
		}
	};

	const handleSearchInputChange = (
		event: React.ChangeEvent<HTMLInputElement>
	): void => {
		setSearchQuery(event.target.value);
	};

	return (
		<div className='min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-8'>
			<div className='max-w-2xl w-full text-center space-y-8'>
				{/* Illustration et titre principal */}
				<div className='space-y-6'>
					{/* Icône illustrative */}
					<div className='flex justify-center'>
						<div className='relative'>
							<div className='size-32 bg-primaire-50 rounded-full flex items-center justify-center'>
								<Package2 className='size-16 text-primaire-100' />
							</div>
							{/* Effet de décoration */}
							<div className='absolute -top-2 -right-2 size-8 bg-accent rounded-full opacity-80' />
							<div className='absolute -bottom-3 -left-3 size-6 bg-avertissement-50 rounded-full opacity-60' />
						</div>
					</div>

					{/* Titre avec la police Fredoka */}
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

				{/* Barre de recherche */}
				{showSearch && (
					<Card className='bg-neutral-50 border-neutral-100 shadow-sm'>
						<CardContent className='p-6'>
							<div className='space-y-4'>
								<div className='flex items-center gap-2 text-neutral-300'>
									<Search className='size-5' />
									<span className='font-medium'>
										Rechercher dans InEat
									</span>
								</div>

								<form
									onSubmit={handleSearch}
									className='flex gap-3'>
									<Input
										type='text'
										placeholder='Rechercher un produit, une recette...'
										value={searchQuery}
										onChange={handleSearchInputChange}
										className='flex-1 border-neutral-200 focus:border-accent'
									/>
									<Button
										type='submit'
										className='bg-accent hover:bg-accent/90 text-white px-6'
										disabled={!searchQuery.trim()}>
										<Search className='size-4' />
									</Button>
								</form>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Actions rapides */}
				{quickActions && (
					<div className='space-y-6'>
						{/* Bouton principal de retour */}
						<div className='flex justify-center'>
							<Link to='/app'>
								<Button
									size='lg'
									className='bg-accent hover:bg-accent/90 text-white px-8 py-3 text-lg font-medium'>
									<Home className='size-5 mr-2' />
									Retour à l'accueil
								</Button>
							</Link>
						</div>

						{/* Actions secondaires */}
						<div className='grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto'>
							<Link to='/app/inventory'>
								<Button
									variant='outline'
									className='w-full h-auto p-4 flex-col gap-2 border-neutral-200 hover:border-accent hover:bg-accent/5'>
									<ShoppingCart className='size-6 text-accent' />
									<span className='font-medium text-neutral-300'>
										Mon stock
									</span>
								</Button>
							</Link>

							<Link to='/app/recipes'>
								<Button
									variant='outline'
									className='w-full h-auto p-4 flex-col gap-2 border-neutral-200 hover:border-accent hover:bg-accent/5'>
									<ChefHat className='size-6 text-accent' />
									<span className='font-medium text-neutral-300'>
										Recettes
									</span>
								</Button>
							</Link>

							<Link to='/app/budget'>
								<Button
									variant='outline'
									className='w-full h-auto p-4 flex-col gap-2 border-neutral-200 hover:border-accent hover:bg-accent/5'>
									<Euro className='size-6 text-accent' />
									<span className='font-medium text-neutral-300'>
										Budget
									</span>
								</Button>
							</Link>
						</div>
					</div>
				)}

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
			</div>
		</div>
	);
};
