import React from 'react';
import { CircleHelp, CalendarX2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';

/**
 * Explication courte de la différence entre DLC et DDM, partagée par l'infobulle
 * et l'avertissement affiché sur un produit expiré.
 */
const ExpiryTypeExplanation: React.FC = () => (
	<ul className='flex flex-col gap-2 text-sm'>
		<li>
			<strong>«&nbsp;À consommer jusqu’au&nbsp;» (DLC)</strong> : à ne pas
			dépasser, surtout pour la viande, le poisson et les produits laitiers
			frais.
		</li>
		<li>
			<strong>«&nbsp;À consommer de préférence avant&nbsp;» (DDM)</strong> :
			souvent encore bon après. Fiez-vous à l’aspect, à l’odeur et au goût.
		</li>
	</ul>
);

/**
 * Icône « ? » à placer à côté d'un libellé de date de péremption.
 */
export const ExpiryTypeInfo: React.FC = () => (
	<Popover>
		<PopoverTrigger asChild>
			<button
				type='button'
				aria-label='Différence entre DLC et DDM'
				className='inline-flex size-5 items-center justify-center rounded-full text-neutral-600 hover:text-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600'>
				<CircleHelp className='size-4' aria-hidden='true' />
			</button>
		</PopoverTrigger>
		<PopoverContent className='w-80'>
			<ExpiryTypeExplanation />
		</PopoverContent>
	</Popover>
);

interface ExpiredProductNoticeProps {
	onKeep: () => void;
	onRemove: () => void;
}

/**
 * Avertissement affiché sur un produit dont la date est dépassée.
 * Tant que l'app ne distingue pas DLC et DDM, il invite à vérifier l'emballage avant de jeter.
 */
export const ExpiredProductNotice: React.FC<ExpiredProductNoticeProps> = ({
	onKeep,
	onRemove,
}) => (
	<Alert variant='warning' role='status'>
		<CalendarX2 aria-hidden='true' />
		<AlertTitle>Ce produit a dépassé sa date</AlertTitle>
		<AlertDescription>
			<p>
				Regardez l’emballage : s’il indique «&nbsp;à consommer de préférence
				avant&nbsp;», il est souvent encore bon. S’il indique «&nbsp;à consommer
				jusqu’au&nbsp;», mieux vaut ne pas le manger.
			</p>
			<div className='mt-3 flex flex-wrap gap-2'>
				<Button size='sm' variant='secondary' onClick={onKeep}>
					Il est encore bon
				</Button>
				<Button size='sm' variant='error' onClick={onRemove}>
					Le retirer du stock
				</Button>
			</div>
		</AlertDescription>
	</Alert>
);
