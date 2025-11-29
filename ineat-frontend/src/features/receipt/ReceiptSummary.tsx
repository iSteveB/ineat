import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store, Calendar, Receipt, Package, TrendingUp } from 'lucide-react';
import type { ReceiptAnalysis } from '@/schemas/receipt';
import { calculateSuccessRate } from '@/schemas/receipt';

/**
 * Props du composant
 */
interface ReceiptSummaryProps {
	analysis: ReceiptAnalysis;
}

/**
 * Composant affichant le résumé d'un ticket scanné
 *
 * Affiche :
 * - Métadonnées du ticket (magasin, date, adresse)
 * - Montant total
 * - Nombre de produits détectés
 * - Taux de succès de l'analyse
 */
export const ReceiptSummary = ({ analysis }: ReceiptSummaryProps) => {
	// ===== HELPERS =====

	/**
	 * Formate une date ISO en format français
	 */
	const formatDate = (dateString: string | null): string => {
		if (!dateString) return 'Non détectée';

		try {
			const date = new Date(dateString);
			return new Intl.DateTimeFormat('fr-FR', {
				day: 'numeric',
				month: 'long',
				year: 'numeric',
			}).format(date);
		} catch {
			return 'Non détectée';
		}
	};

	/**
	 * Formate un montant en euros
	 */
	const formatAmount = (amount: number | null): string => {
		if (amount === null) return 'Non détecté';

		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(amount);
	};

	/**
	 * Badge de confiance selon le taux de succès
	 */
	const getSuccessBadge = (rate: number) => {
		if (rate >= 80) {
			return (
				<Badge
					variant='default'
					className='bg-green-500 hover:bg-green-600'>
					Excellente détection
				</Badge>
			);
		}
		if (rate >= 60) {
			return (
				<Badge
					variant='default'
					className='bg-blue-500 hover:bg-blue-600'>
					Bonne détection
				</Badge>
			);
		}
		return (
			<Badge
				variant='default'
				className='bg-orange-500 hover:bg-orange-600'>
				Vérification nécessaire
			</Badge>
		);
	};

	// ===== RENDU =====

	const successRate = calculateSuccessRate(analysis);

	return (
		<Card>
			<CardHeader>
				<div className='flex items-start justify-between'>
					<CardTitle className='flex items-center gap-2'>
						<Receipt className='size-5 text-primary' />
						Résumé du ticket
					</CardTitle>
					{getSuccessBadge(successRate)}
				</div>
			</CardHeader>

			<CardContent className='space-y-4'>
				{/* Informations magasin */}
				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					{/* Magasin */}
					{analysis.merchantName && (
						<div className='flex items-start gap-3'>
							<Store className='size-5 text-muted-foreground mt-0.5' />
							<div className='flex-1 min-w-0'>
								<p className='text-sm text-muted-foreground'>
									Magasin
								</p>
								<p className='font-medium truncate'>
									{analysis.merchantName}
								</p>
							</div>
						</div>
					)}

					{/* Date */}
					<div className='flex items-start gap-3'>
						<Calendar className='size-5 text-muted-foreground mt-0.5' />
						<div className='flex-1 min-w-0'>
							<p className='text-sm text-muted-foreground'>
								Date d'achat
							</p>
							<p className='font-medium'>
								{formatDate(analysis.purchaseDate)}
							</p>
						</div>
					</div>

					{/* Montant total */}
					<div className='flex items-start gap-3'>
						<Receipt className='size-5 text-muted-foreground mt-0.5' />
						<div className='flex-1 min-w-0'>
							<p className='text-sm text-muted-foreground'>
								Montant total
							</p>
							<p className='font-medium text-lg'>
								{formatAmount(analysis.totalAmount)}
							</p>
						</div>
					</div>
				</div>

				{/* Séparateur */}
				<div className='border-t pt-4'>
					<div className='grid grid-cols-2 gap-4'>
						{/* Nombre de produits */}
						<div className='flex items-start gap-3'>
							<Package className='size-5 text-muted-foreground mt-0.5' />
							<div>
								<p className='text-sm text-muted-foreground'>
									Produits détectés
								</p>
								<p className='font-semibold text-2xl'>
									{analysis.products.length}
								</p>
							</div>
						</div>

						{/* Taux de succès */}
						<div className='flex items-start gap-3'>
							<TrendingUp className='size-5 text-muted-foreground mt-0.5' />
							<div>
								<p className='text-sm text-muted-foreground'>
									Taux de confiance
								</p>
								<p className='font-semibold text-2xl'>
									{successRate}%
								</p>
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

export type { ReceiptSummaryProps };
