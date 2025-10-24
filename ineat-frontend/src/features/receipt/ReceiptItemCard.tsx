import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	CheckCircle2,
	AlertCircle,
	Edit2,
	Trash2,
	Package,
	Tag,
	TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatAmount, CONFIDENCE_THRESHOLDS } from '@/utils/receiptUtils';
import type { ReceiptItem } from '@/services/receiptService';

// ===== TYPES =====

/**
 * Props du composant ReceiptItemCard
 */
interface ReceiptItemCardProps {
	/**
	 * Item du ticket
	 */
	item: ReceiptItem;

	/**
	 * Callback appelé quand on édite l'item
	 */
	onEdit?: (item: ReceiptItem) => void;

	/**
	 * Callback appelé quand on supprime l'item
	 */
	onDelete?: (itemId: string) => void;

	/**
	 * Callback appelé quand on valide/invalide l'item
	 */
	onToggleValidation?: (itemId: string, validated: boolean) => void;

	/**
	 * Indique si les actions sont désactivées
	 */
	disabled?: boolean;

	/**
	 * Classe CSS additionnelle
	 */
	className?: string;
}

// ===== COMPOSANT =====

/**
 * Composant de card pour un item de ticket
 *
 * Fonctionnalités :
 * - Affichage du produit détecté
 * - Badge de confiance (haute/moyenne/faible)
 * - Badge de validation
 * - Informations produit associé (si existant)
 * - Actions : éditer, supprimer, valider
 * - Indicateurs visuels de prix et quantité
 *
 * @example
 * ```tsx
 * <ReceiptItemCard
 *   item={receiptItem}
 *   onEdit={(item) => openEditModal(item)}
 *   onDelete={(id) => deleteItem(id)}
 *   onToggleValidation={(id, val) => updateValidation(id, val)}
 * />
 * ```
 */
export const ReceiptItemCard: React.FC<ReceiptItemCardProps> = ({
	item,
	onEdit,
	onDelete,
	onToggleValidation,
	disabled = false,
	className,
}) => {
	// ===== STATE =====

	const [isDeleting, setIsDeleting] = useState(false);

	// ===== HANDLERS =====

	/**
	 * Gère le clic sur éditer
	 */
	const handleEdit = () => {
		if (!disabled && onEdit) {
			onEdit(item);
		}
	};

	/**
	 * Gère le clic sur supprimer
	 */
	const handleDelete = async () => {
		if (!disabled && onDelete) {
			setIsDeleting(true);
			try {
				await onDelete(item.id);
			} finally {
				setIsDeleting(false);
			}
		}
	};

	/**
	 * Gère le toggle de validation
	 */
	const handleToggleValidation = () => {
		if (!disabled && onToggleValidation) {
			onToggleValidation(item.id, !item.validated);
		}
	};

	// ===== CALCULS =====

	/**
	 * Détermine le badge de confiance
	 */
	const getConfidenceBadge = () => {
		const confidence = item.confidence;

		if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
			return (
				<Badge variant='success' className='gap-1 bg-green-600'>
					<TrendingUp className='size-3' />
					Confiance élevée
				</Badge>
			);
		}

		if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
			return (
				<Badge variant='secondary' className='gap-1 bg-yellow-600'>
					<TrendingUp className='size-3' />
					Confiance moyenne
				</Badge>
			);
		}

		return (
			<Badge variant='warning' className='gap-1'>
				<AlertCircle className='size-3' />
				Confiance faible
			</Badge>
		);
	};

	/**
	 * Détermine le nom à afficher
	 */
	const getDisplayName = () => {
		// Si produit associé, afficher son nom
		if (item.product) {
			return item.product.name;
		}

		// Sinon, afficher le nom détecté
		return item.detectedName;
	};

	/**
	 * Vérifie si l'item a un produit associé
	 */
	const hasProduct = item.product !== null && item.product !== undefined;

	// ===== RENDU =====

	return (
		<Card
			className={cn(
				'transition-all',
				item.validated && 'border-green-500 bg-green-50/50',
				disabled && 'opacity-50 cursor-not-allowed',
				className
			)}>
			<CardContent className='p-4 space-y-3'>
				{/* Header avec nom et badges */}
				<div className='flex items-start justify-between gap-3'>
					<div className='flex-1 min-w-0'>
						<div className='flex items-center gap-2 flex-wrap'>
							<h3 className='font-semibold text-lg'>
								{getDisplayName()}
							</h3>
							{item.validated && (
								<CheckCircle2 className='size-5 text-green-600 flex-shrink-0' />
							)}
						</div>

						{/* Si nom détecté différent du produit */}
						{hasProduct &&
							item.detectedName !== item.product?.name && (
								<p className='text-sm text-muted-foreground mt-1'>
									Détecté : {item.detectedName}
								</p>
							)}

						{/* Marque si disponible */}
						{item.product?.brand && (
							<p className='text-sm text-muted-foreground mt-1'>
								{item.product.brand}
							</p>
						)}
					</div>

					<div className='flex flex-col gap-2 items-end'>
						{getConfidenceBadge()}
						{hasProduct && (
							<Badge variant='outline' className='gap-1'>
								<Package className='size-3' />
								Produit associé
							</Badge>
						)}
					</div>
				</div>

				{/* Informations détaillées */}
				<div className='grid grid-cols-2 gap-3 text-sm'>
					{/* Quantité */}
					<div>
						<p className='text-muted-foreground'>Quantité</p>
						<p className='font-medium'>
							{item.quantity}{' '}
							{item.product?.unitType || 'unité(s)'}
						</p>
					</div>

					{/* Prix unitaire */}
					{item.unitPrice !== null &&
						item.unitPrice !== undefined && (
							<div>
								<p className='text-muted-foreground'>
									Prix unitaire
								</p>
								<p className='font-medium'>
									{formatAmount(item.unitPrice)}
								</p>
							</div>
						)}

					{/* Prix total */}
					{item.totalPrice !== null &&
						item.totalPrice !== undefined && (
							<div>
								<p className='text-muted-foreground'>
									Prix total
								</p>
								<p className='font-medium text-green-600'>
									{formatAmount(item.totalPrice)}
								</p>
							</div>
						)}

					{/* Catégorie */}
					{(item.product?.category || item.categoryGuess) && (
						<div>
							<p className='text-muted-foreground'>Catégorie</p>
							<div className='flex items-center gap-1'>
								<Tag className='size-3' />
								<p className='font-medium'>
									{item.product?.category.name ||
										item.categoryGuess}
								</p>
							</div>
						</div>
					)}
				</div>

				{/* Informations supplémentaires */}
				{(item.expiryDate || item.storageLocation || item.notes) && (
					<div className='pt-3 border-t space-y-2 text-sm'>
						{item.expiryDate && (
							<div className='flex items-center justify-between'>
								<span className='text-muted-foreground'>
									Date de péremption :
								</span>
								<span className='font-medium'>
									{new Date(
										item.expiryDate
									).toLocaleDateString('fr-FR')}
								</span>
							</div>
						)}

						{item.storageLocation && (
							<div className='flex items-center justify-between'>
								<span className='text-muted-foreground'>
									Emplacement :
								</span>
								<span className='font-medium'>
									{item.storageLocation}
								</span>
							</div>
						)}

						{item.notes && (
							<div>
								<span className='text-muted-foreground'>
									Notes :
								</span>
								<p className='mt-1 text-muted-foreground italic'>
									{item.notes}
								</p>
							</div>
						)}
					</div>
				)}

				{/* Actions */}
				<div className='flex items-center gap-2 pt-3 border-t'>
					<Button
						size='sm'
						variant={item.validated ? 'outline' : 'primary'}
						onClick={handleToggleValidation}
						disabled={disabled}
						className='flex-1'>
						<CheckCircle2 className='size-4 mr-2' />
						{item.validated ? 'Validé' : 'Valider'}
					</Button>

					{onEdit && (
						<Button
							size='sm'
							variant='outline'
							onClick={handleEdit}
							disabled={disabled}>
							<Edit2 className='size-4' />
						</Button>
					)}

					{onDelete && (
						<Button
							size='sm'
							variant='outline'
							onClick={handleDelete}
							disabled={disabled || isDeleting}
							className='text-red-400 hover:bg-red-400/10'>
							<Trash2 className='size-4' />
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
};

export type { ReceiptItemCardProps };
