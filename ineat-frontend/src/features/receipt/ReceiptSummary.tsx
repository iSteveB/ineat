import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
	Store,
	Calendar,
	CreditCard,
	MapPin,
	CheckCircle2,
	Clock,
	AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatAmount, formatRelativeDate } from '@/utils/receiptUtils';
import type { ReceiptMetadata } from '@/services/receiptService';

// ===== TYPES =====

/**
 * Props du composant ReceiptSummary
 */
interface ReceiptSummaryProps {
	/**
	 * Métadonnées du ticket
	 */
	receipt: ReceiptMetadata;

	/**
	 * Nombre total d'items détectés
	 */
	totalItems: number;

	/**
	 * Nombre d'items validés
	 */
	validatedItems: number;

	/**
	 * Progression de validation (0-100)
	 */
	validationProgress: number;

	/**
	 * Indique si le ticket est prêt pour l'inventaire
	 */
	readyForInventory: boolean;

	/**
	 * Indique si le ticket a été ajouté à l'inventaire
	 */
	addedToInventory?: boolean;

	/**
	 * Classe CSS additionnelle
	 */
	className?: string;
}

// ===== COMPOSANT =====

/**
 * Composant d'affichage du résumé d'un ticket de caisse
 * 
 * Affiche :
 * - Informations du magasin (nom, localisation)
 * - Montant total
 * - Date d'achat
 * - Date de scan
 * - Statut de validation
 * - Badge de statut
 * 
 * @example
 * ```tsx
 * <ReceiptSummary
 *   receipt={receiptData}
 *   totalItems={15}
 *   validatedItems={15}
 *   validationProgress={100}
 *   readyForInventory={true}
 * />
 * ```
 */
export const ReceiptSummary: React.FC<ReceiptSummaryProps> = ({
	receipt,
	totalItems,
	validatedItems,
	validationProgress,
	readyForInventory,
	addedToInventory = false,
	className,
}) => {
	// ===== CALCULS =====

	/**
	 * Détermine le badge de statut
	 */
	const getStatusBadge = () => {
		if (addedToInventory) {
			return (
				<Badge variant="default" className="gap-1 bg-green-600">
					<CheckCircle2 className="size-3" />
					Ajouté à l'inventaire
				</Badge>
			);
		}

		if (readyForInventory) {
			return (
				<Badge variant="default" className="gap-1">
					<CheckCircle2 className="size-3" />
					Prêt à valider
				</Badge>
			);
		}

		if (validationProgress > 0) {
			return (
				<Badge variant="secondary" className="gap-1">
					<Clock className="size-3" />
					Validation en cours ({validatedItems}/{totalItems})
				</Badge>
			);
		}

		return (
			<Badge variant="outline" className="gap-1">
				<AlertCircle className="size-3" />
				En attente
			</Badge>
		);
	};

	// ===== RENDU =====

	return (
		<Card className={cn('w-full', className)}>
			<CardHeader>
				<div className="flex items-start justify-between">
					<CardTitle className="text-xl">Résumé du ticket</CardTitle>
					{getStatusBadge()}
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Informations du magasin */}
				{receipt.merchantName && (
					<div className="flex items-start gap-3">
						<div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
							<Store className="size-5" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm text-muted-foreground">Magasin</p>
							<p className="font-medium">{receipt.merchantName}</p>
							{receipt.merchantAddress && (
								<div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
									<MapPin className="size-3" />
									{receipt.merchantAddress}
								</div>
							)}
						</div>
					</div>
				)}

				{/* Montant total */}
				{receipt.totalAmount !== null && receipt.totalAmount !== undefined && (
					<div className="flex items-start gap-3">
						<div className="flex items-center justify-center size-10 rounded-lg bg-green-500/10 text-green-600">
							<CreditCard className="size-5" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm text-muted-foreground">Montant total</p>
							<p className="text-2xl font-bold text-green-600">
								{formatAmount(receipt.totalAmount)}
							</p>
						</div>
					</div>
				)}

				{/* Date d'achat */}
				{receipt.purchaseDate && (
					<div className="flex items-start gap-3">
						<div className="flex items-center justify-center size-10 rounded-lg bg-blue-500/10 text-blue-600">
							<Calendar className="size-5" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm text-muted-foreground">Date d'achat</p>
							<p className="font-medium">
								{new Date(receipt.purchaseDate).toLocaleDateString('fr-FR', {
									weekday: 'long',
									year: 'numeric',
									month: 'long',
									day: 'numeric',
								})}
							</p>
						</div>
					</div>
				)}

				{/* Statistiques de validation */}
				<div className="pt-4 border-t space-y-2">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Articles détectés</span>
						<span className="font-medium">{totalItems}</span>
					</div>

					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Articles validés</span>
						<span className="font-medium">
							{validatedItems} / {totalItems}
						</span>
					</div>

					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Progression</span>
						<span className="font-medium">{validationProgress}%</span>
					</div>
				</div>

				{/* Date de scan */}
				<div className="pt-4 border-t">
					<p className="text-xs text-muted-foreground">
						Scanné {formatRelativeDate(receipt.createdAt)}
					</p>
				</div>
			</CardContent>
		</Card>
	);
};

export type { ReceiptSummaryProps };