import React, { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Eye,
	Trash2,
	Store,
	Calendar,
	CheckCircle2,
	Clock,
	XCircle,
	AlertCircle,
	ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatAmount, formatRelativeDate } from '@/utils/receiptUtils';
import type { ReceiptHistoryItem } from '@/services/receiptService';

// ===== TYPES =====

/**
 * Props du composant ReceiptHistoryList
 */
interface ReceiptHistoryListProps {
	/**
	 * Liste des tickets
	 */
	receipts: ReceiptHistoryItem[];

	/**
	 * Callback appelé pour voir les détails
	 */
	onViewReceipt?: (receiptId: string) => void;

	/**
	 * Callback appelé pour supprimer un ticket
	 */
	onDeleteReceipt?: (receiptId: string) => void;

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
 * Composant de liste d'historique des tickets
 * 
 * Fonctionnalités :
 * - Affichage de tous les tickets
 * - Badge de statut (processing, completed, validated, failed)
 * - Informations du ticket (magasin, montant, date)
 * - Actions : voir les détails, supprimer
 * - Badge "Ajouté à l'inventaire"
 * 
 * @example
 * ```tsx
 * <ReceiptHistoryList
 *   receipts={historyData}
 *   onViewReceipt={(id) => navigate(`/receipts/${id}/results`)}
 *   onDeleteReceipt={(id) => deleteReceipt(id)}
 * />
 * ```
 */
export const ReceiptHistoryList: React.FC<ReceiptHistoryListProps> = ({
	receipts,
	onViewReceipt,
	onDeleteReceipt,
	disabled = false,
	className,
}) => {
	const navigate = useNavigate();

	// ===== HANDLERS =====

	/**
	 * Gère le clic sur "Voir"
	 */
	const handleViewReceipt = (receiptId: string) => {
		if (onViewReceipt) {
			onViewReceipt(receiptId);
		} else {
			navigate({
				to: '/app/receipt/$receiptId/results',
				params: { receiptId },
			});
		}
	};

	/**
	 * Gère le clic sur "Supprimer"
	 */
	const handleDeleteReceipt = (receiptId: string) => {
		if (onDeleteReceipt && !disabled) {
			onDeleteReceipt(receiptId);
		}
	};

	// ===== HELPERS =====

	/**
	 * Retourne le badge de statut approprié
	 */
	const getStatusBadge = (receipt: ReceiptHistoryItem) => {
		if (receipt.addedToInventory) {
			return (
				<Badge variant="default" className="gap-1 bg-green-600">
					<ShoppingCart className="size-3" />
					Dans l'inventaire
				</Badge>
			);
		}

		switch (receipt.status) {
			case 'PROCESSING':
				return (
					<Badge variant="secondary" className="gap-1">
						<Clock className="size-3 animate-pulse" />
						En traitement
					</Badge>
				);
			case 'COMPLETED':
				return (
					<Badge variant="default" className="gap-1">
						<CheckCircle2 className="size-3" />
						Traité
					</Badge>
				);
			case 'VALIDATED':
				return (
					<Badge variant="default" className="gap-1 bg-blue-600">
						<CheckCircle2 className="size-3" />
						Validé
					</Badge>
				);
			case 'FAILED':
				return (
					<Badge variant="destructive" className="gap-1">
						<XCircle className="size-3" />
						Échec
					</Badge>
				);
			default:
				return (
					<Badge variant="outline" className="gap-1">
						<AlertCircle className="size-3" />
						Inconnu
					</Badge>
				);
		}
	};

	/**
	 * Détermine si un ticket peut être supprimé
	 */
	const canDelete = (receipt: ReceiptHistoryItem): boolean => {
		// Ne pas supprimer si déjà ajouté à l'inventaire
		return !receipt.addedToInventory;
	};

	// ===== CALCULS =====

	/**
	 * Trie les tickets par date (plus récent en premier)
	 */
	const sortedReceipts = useMemo(() => {
		return [...receipts].sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);
	}, [receipts]);

	// ===== RENDU =====

	if (receipts.length === 0) {
		return (
			<Card className={className}>
				<CardContent className="p-8 text-center">
					<AlertCircle className="size-12 mx-auto mb-4 text-muted-foreground" />
					<p className="text-muted-foreground">Aucun ticket trouvé</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className={cn('space-y-3', className)}>
			{sortedReceipts.map((receipt) => (
				<Card
					key={receipt.id}
					className={cn(
						'transition-all hover:shadow-md',
						disabled && 'opacity-50 cursor-not-allowed'
					)}
				>
					<CardContent className="p-4">
						<div className="flex items-start justify-between gap-4">
							{/* Image du ticket */}
							<div className="flex-shrink-0">
								{receipt.imageUrl ? (
									<img
										src={receipt.imageUrl}
										alt="Ticket"
										className="size-20 rounded-lg object-cover border"
									/>
								) : (
									<div className="size-20 rounded-lg bg-muted flex items-center justify-center border">
										<Store className="size-8 text-muted-foreground" />
									</div>
								)}
							</div>

							{/* Informations */}
							<div className="flex-1 min-w-0 space-y-2">
								{/* Header avec nom magasin et statut */}
								<div className="flex items-start justify-between gap-2">
									<div>
										<h3 className="font-semibold">
											{receipt.storeName || 'Magasin inconnu'}
										</h3>
										{receipt.storeLocation && (
											<p className="text-sm text-muted-foreground">
												{receipt.storeLocation}
											</p>
										)}
									</div>
									{getStatusBadge(receipt)}
								</div>

								{/* Détails */}
								<div className="grid grid-cols-2 gap-2 text-sm">
									{/* Montant */}
									{receipt.totalAmount !== null &&
										receipt.totalAmount !== undefined && (
											<div className="flex items-center gap-1">
												<span className="text-muted-foreground">Montant:</span>
												<span className="font-medium text-green-600">
													{formatAmount(receipt.totalAmount)}
												</span>
											</div>
										)}

									{/* Articles */}
									<div className="flex items-center gap-1">
										<span className="text-muted-foreground">Articles:</span>
										<span className="font-medium">
											{receipt.validatedItems}/{receipt.totalItems}
										</span>
									</div>

									{/* Date d'achat */}
									{receipt.purchaseDate && (
										<div className="flex items-center gap-1">
											<Calendar className="size-3 text-muted-foreground" />
											<span className="text-muted-foreground">
												{new Date(receipt.purchaseDate).toLocaleDateString(
													'fr-FR'
												)}
											</span>
										</div>
									)}

									{/* Date de scan */}
									<div className="flex items-center gap-1">
										<Clock className="size-3 text-muted-foreground" />
										<span className="text-muted-foreground">
											Scanné {formatRelativeDate(receipt.createdAt)}
										</span>
									</div>
								</div>

								{/* Barre de progression */}
								{receipt.totalItems > 0 && (
									<div className="space-y-1">
										<div className="flex items-center justify-between text-xs">
											<span className="text-muted-foreground">Validation</span>
											<span className="font-medium">
												{receipt.validationProgress}%
											</span>
										</div>
										<div className="w-full bg-muted rounded-full h-1.5">
											<div
												className={cn(
													'h-1.5 rounded-full transition-all',
													receipt.validationProgress === 100
														? 'bg-green-600'
														: 'bg-primary'
												)}
												style={{
													width: `${receipt.validationProgress}%`,
												}}
											/>
										</div>
									</div>
								)}
							</div>

							{/* Actions */}
							<div className="flex flex-col gap-2">
								<Button
									size="sm"
									variant="outline"
									onClick={() => handleViewReceipt(receipt.id)}
									disabled={disabled}
								>
									<Eye className="size-4 mr-1" />
									Voir
								</Button>

								{canDelete(receipt) && onDeleteReceipt && (
									<Button
										size="sm"
										variant="outline"
										onClick={() => handleDeleteReceipt(receipt.id)}
										disabled={disabled}
										className="text-destructive hover:bg-destructive/10"
									>
										<Trash2 className="size-4 mr-1" />
										Supprimer
									</Button>
								)}
							</div>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
};

export type { ReceiptHistoryListProps };