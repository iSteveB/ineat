import { Heart } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FavoriteRecipeButtonProps = {
	isFavorite: boolean;
	isPending?: boolean;
	onToggle: () => void;
	/** Précise le libellé quand plusieurs recettes sont affichées. */
	recipeName?: string;
	className?: string;
};

/** Bouton bascule : le libellé reste fixe, aria-pressed porte l'état. */
export function FavoriteRecipeButton({
	isFavorite,
	isPending = false,
	onToggle,
	recipeName,
	className,
}: FavoriteRecipeButtonProps) {
	const label = recipeName ? `Mettre en favori : ${recipeName}` : 'Mettre en favori';

	return (
		<Button
			type='button'
			variant='secondary'
			size='icon'
			aria-label={label}
			aria-pressed={isFavorite}
			title={label}
			disabled={isPending}
			onClick={onToggle}
			className={cn(isFavorite && 'border-danger-600', className)}>
			<Heart
				className={cn('text-danger-600', isFavorite && 'fill-current')}
				aria-hidden='true'
			/>
		</Button>
	);
}
