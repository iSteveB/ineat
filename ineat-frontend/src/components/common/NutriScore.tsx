import type { FC } from 'react';

import { cn } from '@/lib/utils';
import type { NutriScore as NutriScoreValue } from '@/schemas';

interface NutriScoreProps {
	score: NutriScoreValue;
	size?: 'sm' | 'md';
	className?: string;
}

const LETTERS: NutriScoreValue[] = ['A', 'B', 'C', 'D', 'E'];

const SEGMENT_COLORS: Record<NutriScoreValue, string> = {
	A: 'bg-nutri-a',
	B: 'bg-nutri-b',
	C: 'bg-nutri-c',
	D: 'bg-nutri-d',
	E: 'bg-nutri-e',
};

/**
 * Frise officielle du Nutri-Score. La note est annoncée en texte (role="img") :
 * les lettres, couleurs réglementées du logo, sont masquées aux lecteurs d'écran.
 */
const NutriScore: FC<NutriScoreProps> = ({ score, size = 'md', className }) => {
	const isSmall = size === 'sm';

	return (
		<span
			role='img'
			aria-label={`Nutri-Score ${score}`}
			className={cn(
				'inline-flex flex-col items-center rounded-md border border-neutral-300 bg-surface',
				isSmall ? 'gap-0.5 px-1 pb-1 pt-0.5' : 'gap-0.5 px-1.5 pb-1.5 pt-1',
				className
			)}>
			<span
				aria-hidden='true'
				className={cn(
					'font-bold tracking-wider text-neutral-600',
					isSmall ? 'text-[0.4375rem] leading-2' : 'text-[0.5625rem] leading-2.5'
				)}>
				NUTRI-SCORE
			</span>
			<span aria-hidden='true' className={cn('flex items-center', isSmall ? 'px-0.5 pb-0.5 pt-1' : 'px-0.5 pb-0.5 pt-1.5')}>
				{LETTERS.map((letter) => {
					const isActive = letter === score;

					return (
						<span
							key={letter}
							className={cn(
								'grid place-items-center font-bold text-surface first:rounded-l-lg last:rounded-r-lg',
								SEGMENT_COLORS[letter],
								isActive
									? cn(
											'relative z-10 rounded-[0.625rem] border-2 border-surface shadow-sm',
											isSmall ? '-mx-0.5 -my-1 h-6.5 w-5.5 text-[0.9375rem]' : '-mx-0.5 -my-1.5 h-8.5 w-7.5 text-xl'
										)
									: cn('opacity-90', isSmall ? 'h-4.5 w-4 text-[0.6875rem]' : 'h-6 w-5.5 text-sm')
							)}>
							{letter}
						</span>
					);
				})}
			</span>
		</span>
	);
};

export default NutriScore;
