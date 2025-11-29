import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
	CheckCircle2,
	XCircle,
	Package,
	TrendingUp,
	AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DetectedProduct } from '@/schemas/receipt';

/**
 * Props du composant
 */
interface ProductCardConfidentProps {
	product: DetectedProduct;
	onSelectEan: (ean: string) => void;
	onSkip: () => void;
}

/**
 * Composant affichant un produit bien identifié (Phase 1)
 * 
 * Affiche :
 * - Nom du produit détecté
 * - Quantité et prix
 * - Liste de suggestions EAN avec radio buttons
 * - Images OpenFoodFacts
 * - Actions : Sélectionner, Ignorer
 */
export const ProductCardConfident = ({
	product,
	onSelectEan,
	onSkip,
}: ProductCardConfidentProps) => {
	// ===== HELPERS =====

	/**
	 * Formate un montant en euros
	 */
	const formatPrice = (price: number | null): string => {
		if (price === null) return 'N/A';
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(price);
	};

	/**
	 * Badge de confiance selon le score
	 */
	const getConfidenceBadge = (confidence: number) => {
		if (confidence >= 0.8) {
			return (
				<Badge variant='default' className='bg-green-500 hover:bg-green-600 text-xs'>
					Haute confiance
				</Badge>
			);
		}
		if (confidence >= 0.6) {
			return (
				<Badge variant='default' className='bg-blue-500 hover:bg-blue-600 text-xs'>
					Confiance moyenne
				</Badge>
			);
		}
		return (
			<Badge variant='default' className='bg-orange-500 hover:bg-orange-600 text-xs'>
				Faible confiance
			</Badge>
		);
	};

	/**
	 * Badge de statut du produit
	 */
	const getStatusBadge = () => {
		switch (product.status) {
			case 'validated':
				return (
					<Badge variant='default' className='bg-green-500'>
						<CheckCircle2 className='size-3 mr-1' />
						Validé
					</Badge>
				);
			case 'skipped':
				return (
					<Badge variant='secondary'>
						<XCircle className='size-3 mr-1' />
						Ignoré
					</Badge>
				);
			default:
				return (
					<Badge variant='outline'>
						<AlertCircle className='size-3 mr-1' />
						En attente
					</Badge>
				);
		}
	};

	// ===== HANDLERS =====

	const handleEanSelect = (ean: string) => {
		onSelectEan(ean);
	};

	// ===== RENDU =====

	return (
		<Card className={cn(
			'transition-all',
			product.status === 'validated' && 'border-green-500 bg-green-50/50',
			product.status === 'skipped' && 'opacity-60'
		)}>
			<CardHeader>
				<div className='flex items-start justify-between gap-3'>
					<CardTitle className='flex items-center gap-2 text-lg'>
						<Package className='size-5 text-primary' />
						{product.name}
					</CardTitle>
					{getStatusBadge()}
				</div>

				{/* Infos produit */}
				<div className='flex items-center gap-4 text-sm text-muted-foreground'>
					<span>Quantité : {product.quantity || 1}</span>
					{product.unitPrice && (
						<span>Prix unitaire : {formatPrice(product.unitPrice)}</span>
					)}
					{product.totalPrice && (
						<span className='font-medium text-foreground'>
							Total : {formatPrice(product.totalPrice)}
						</span>
					)}
				</div>

				{/* Badge confiance */}
				<div className='flex items-center gap-2'>
					<TrendingUp className='size-4 text-muted-foreground' />
					{getConfidenceBadge(product.confidence)}
					<span className='text-xs text-muted-foreground'>
						{Math.round(product.confidence * 100)}%
					</span>
				</div>
			</CardHeader>

			<CardContent className='space-y-4'>
				{/* Suggestions EAN */}
				{product.suggestedEans.length > 0 && (
					<div className='space-y-3'>
						<p className='text-sm font-medium'>
							Sélectionnez le bon code EAN :
						</p>

						<RadioGroup
							value={product.selectedEan || undefined}
							onValueChange={handleEanSelect}
							disabled={product.status === 'skipped'}
						>
							{product.suggestedEans.map((suggestion) => (
								<div
									key={suggestion.ean}
									className={cn(
										'flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/50',
										product.selectedEan === suggestion.ean && 'border-primary bg-primary/5'
									)}
								>
									<RadioGroupItem
										value={suggestion.ean}
										id={`${product.id}-${suggestion.ean}`}
										className='mt-1'
									/>

									<div className='flex-1 min-w-0 space-y-2'>
										<Label
											htmlFor={`${product.id}-${suggestion.ean}`}
											className='cursor-pointer'
										>
											<div className='flex items-start justify-between gap-2'>
												<div className='flex-1 min-w-0'>
													<p className='font-medium text-sm'>
														{suggestion.productName}
													</p>
													<p className='text-xs text-muted-foreground font-mono'>
														EAN: {suggestion.ean}
													</p>
												</div>

												{/* Badge confiance suggestion */}
												<Badge
													variant='outline'
													className={cn(
														'text-xs',
														suggestion.confidence >= 0.8 && 'border-green-500 text-green-700',
														suggestion.confidence >= 0.6 && suggestion.confidence < 0.8 && 'border-blue-500 text-blue-700',
														suggestion.confidence < 0.6 && 'border-orange-500 text-orange-700'
													)}
												>
													{Math.round(suggestion.confidence * 100)}%
												</Badge>
											</div>

											{/* Image produit */}
											{suggestion.image && (
												<img
													src={suggestion.image}
													alt={suggestion.productName}
													className='mt-2 size-16 rounded object-contain border bg-white'
													onError={(e) => {
														e.currentTarget.style.display = 'none';
													}}
												/>
											)}
										</Label>
									</div>
								</div>
							))}
						</RadioGroup>
					</div>
				)}

				{/* Avertissement si pas de suggestions */}
				{product.suggestedEans.length === 0 && (
					<div className='text-sm text-muted-foreground bg-orange-50 p-3 rounded-lg border border-orange-200'>
						<AlertCircle className='size-4 inline mr-2 text-orange-600' />
						Aucune suggestion EAN disponible pour ce produit.
					</div>
				)}

				{/* Actions */}
				<div className='flex items-center gap-2 pt-2'>
					{product.status === 'pending' && (
						<>
							<Button
								variant='outline'
								size='sm'
								onClick={onSkip}
								className='flex-1'
							>
								<XCircle className='size-4 mr-2' />
								Ignorer
							</Button>

							{product.selectedEan && (
								<div className='flex-1 text-center'>
									<p className='text-xs text-green-600 font-medium'>
										<CheckCircle2 className='size-3 inline mr-1' />
										Sélectionné
									</p>
								</div>
							)}
						</>
					)}

					{product.status === 'validated' && (
						<p className='text-sm text-green-600 font-medium w-full text-center'>
							<CheckCircle2 className='size-4 inline mr-2' />
							Produit validé avec le code {product.selectedEan}
						</p>
					)}

					{product.status === 'skipped' && (
						<p className='text-sm text-muted-foreground w-full text-center'>
							<XCircle className='size-4 inline mr-2' />
							Produit ignoré
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
};

export type { ProductCardConfidentProps };