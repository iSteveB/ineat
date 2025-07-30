import { createFileRoute, Link } from '@tanstack/react-router';
import { AddManualProductPage } from '@/pages/Inventory/AddManualProductPage';

export const Route = createFileRoute('/app/inventory/add/search')({
	component: AddManualProductPage,
	errorComponent: ErrorComponent,
});

function ErrorComponent() {
	return (
		<div className='min-h-screen flex items-center justify-center'>
			<div className='text-center'>
				<h1 className='text-2xl font-bold text-neutral-300'>
					Erreur 404
				</h1>
				<p className='text-neutral-200 mt-2'>Page non trouvée</p>
				<Link
					to='/app/inventory'
					className='text-neutral-200 mt-2 underline'>
					Retourner à l'inventaire
				</Link>
			</div>
		</div>
	);
}
