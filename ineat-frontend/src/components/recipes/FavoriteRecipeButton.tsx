import { Heart } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FavoriteRecipeButtonProps = {
	isFavorite: boolean;
	isPending?: boolean;
	onToggle: () => void;
	className?: string;
};

export function FavoriteRecipeButton({
	isFavorite,
	isPending = false,
	onToggle,
	className,
}: FavoriteRecipeButtonProps) {
	const label = isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris';

	return (
		<Button
			type='button'
			variant='secondary'
			size='icon-lg'
			aria-label={label}
			aria-pressed={isFavorite}
			title={label}
			disabled={isPending}
			onClick={onToggle}
			className={cn('bg-neutral-50/95', className)}>
			<Heart
				className={cn(
					'size-5 text-success-700',
					isFavorite && 'fill-current'
				)}
			/>
		</Button>
	);
}
