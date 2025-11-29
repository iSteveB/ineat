import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, ArrowRight, AlertTriangle, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Props du composant
 */
interface Phase1ActionsProps {
	totalProducts: number;
	validatedCount: number;
	isComplete: boolean;
	hasPhase2: boolean;
	onValidate: () => void;
	onSkipToPhase2: () => void;
}

/**
 * Composant des actions de validation Phase 1
 *
 * Affiche :
 * - Progression de validation (X/Y produits)
 * - Barre de progression
 * - Bouton principal "Valider et continuer"
 * - Lien optionnel pour passer à Phase 2
 */
export const Phase1Actions = ({
	totalProducts,
	validatedCount,
	isComplete,
	hasPhase2,
	onValidate,
	onSkipToPhase2,
}: Phase1ActionsProps) => {
	// ===== CALCULS =====

	const skippedCount = totalProducts - validatedCount;
	const progress =
		totalProducts > 0 ? (validatedCount / totalProducts) * 100 : 0;

	// ===== HELPERS =====

	/**
	 * Message selon l'état
	 */
	const getMessage = () => {
		if (!isComplete) {
			return 'Sélectionnez un code EAN ou ignorez chaque produit pour continuer';
		}

		if (hasPhase2) {
			return `${validatedCount} produits validés. Passez à la Phase 2 pour gérer les produits difficiles.`;
		}

		return `${validatedCount} produits validés. Vous pouvez les ajouter à l'inventaire !`;
	};

	/**
	 * Texte du bouton principal
	 */
	const getButtonText = () => {
		if (!hasPhase2) {
			return 'Terminer la validation';
		}
		return 'Valider et passer à la Phase 2';
	};

	// ===== RENDU =====

	return (
		<Card
			className={cn(
				'sticky bottom-4 shadow-lg',
				isComplete && 'border-green-500'
			)}>
			<CardContent className='p-6 space-y-4'>
				{/* Statistiques */}
				<div className='space-y-3'>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-2'>
							<Package className='size-5 text-primary' />
							<span className='font-semibold text-lg'>
								Phase 1 : Produits bien identifiés
							</span>
						</div>

						{isComplete && (
							<CheckCircle2 className='size-6 text-green-600' />
						)}
					</div>

					{/* Progression */}
					<div className='space-y-2'>
						<div className='flex items-center justify-between text-sm'>
							<span className='text-muted-foreground'>
								Progression
							</span>
							<span className='font-medium'>
								{validatedCount}/{totalProducts} produits
								traités
							</span>
						</div>

						<Progress value={progress} className='h-2' />

						<div className='flex items-center justify-between text-xs text-muted-foreground'>
							<span>
								<CheckCircle2 className='size-3 inline mr-1 text-green-600' />
								{validatedCount} validés
							</span>
							{skippedCount > 0 && (
								<span>{skippedCount} ignorés</span>
							)}
						</div>
					</div>
				</div>

				{/* Message */}
				<div
					className={cn(
						'text-sm p-3 rounded-lg',
						!isComplete &&
							'bg-orange-50 text-orange-800 border border-orange-200',
						isComplete &&
							hasPhase2 &&
							'bg-blue-50 text-blue-800 border border-blue-200',
						isComplete &&
							!hasPhase2 &&
							'bg-green-50 text-green-800 border border-green-200'
					)}>
					{!isComplete && (
						<AlertTriangle className='size-4 inline mr-2' />
					)}
					{isComplete && (
						<CheckCircle2 className='size-4 inline mr-2' />
					)}
					{getMessage()}
				</div>

				{/* Actions */}
				<div className='space-y-2'>
					{/* Bouton principal */}
					<Button
						size='lg'
						className='w-full'
						onClick={onValidate}
						disabled={!isComplete}>
						{getButtonText()}
						<ArrowRight className='size-5 ml-2' />
					</Button>

					{/* Lien Phase 2 (si pas complete mais Phase 2 existe) */}
					{!isComplete && hasPhase2 && (
						<Button
							variant='ghost'
							size='sm'
							className='w-full'
							onClick={onSkipToPhase2}>
							Passer directement à la Phase 2
						</Button>
					)}
				</div>

				{/* Info supplémentaire */}
				{!isComplete && (
					<p className='text-xs text-center text-muted-foreground'>
						Vous devez traiter tous les produits avant de continuer
					</p>
				)}
			</CardContent>
		</Card>
	);
};

export type { Phase1ActionsProps };
