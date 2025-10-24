import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
	ArrowLeft,
	Loader2,
	AlertTriangle,
	Filter,
	Receipt,
	TrendingUp,
	Package,
	DollarSign,
} from 'lucide-react';
import { ReceiptHistoryList } from '@/features/receipt/ReceiptHistoryList';
import { receiptService } from '@/services/receiptService';
import { formatAmount } from '@/utils/receiptUtils';
import type {
	ReceiptHistoryItem,
	ReceiptHistoryFilters,
	ReceiptHistoryStats,
	ReceiptStatusFilter,
	ReceiptSortOrder,
} from '@/services/receiptService';

// ===== TYPES =====

/**
 * État de la page
 */
interface PageState {
	receipts: ReceiptHistoryItem[];
	stats: ReceiptHistoryStats | null;
	isLoading: boolean;
	error: string | null;
}

/**
 * État des filtres
 */
interface FiltersState {
	status: ReceiptStatusFilter;
	sortOrder: ReceiptSortOrder;
	searchQuery: string;
	startDate: string;
	endDate: string;
}

// ===== COMPOSANT =====

/**
 * Page d'historique des tickets scannés
 *
 * Fonctionnalités :
 * - Liste de tous les tickets
 * - Filtres (statut, dates, recherche)
 * - Tri (date, montant)
 * - Statistiques globales
 * - Suppression de tickets
 * - Navigation vers les détails
 *
 * @example
 * Route: /app/receipts/history
 */
export const ReceiptHistoryPage: React.FC = () => {
	// ===== NAVIGATION =====

	const navigate = useNavigate();

	// ===== STATE =====

	const [pageState, setPageState] = useState<PageState>({
		receipts: [],
		stats: null,
		isLoading: true,
		error: null,
	});

	const [filters, setFilters] = useState<FiltersState>({
		status: 'ALL',
		sortOrder: 'NEWEST',
		searchQuery: '',
		startDate: '',
		endDate: '',
	});

	// ===== CHARGEMENT DES DONNÉES =====

	/**
	 * Charge l'historique avec les filtres appliqués
	 */
	const loadHistory = useCallback(async () => {
		setPageState((prev) => ({ ...prev, isLoading: true, error: null }));

		try {
			// Construire les filtres pour l'API
			const apiFilters: ReceiptHistoryFilters = {
				status: filters.status !== 'ALL' ? filters.status : undefined,
				sortOrder: filters.sortOrder,
				search: filters.searchQuery || undefined,
				startDate: filters.startDate || undefined,
				endDate: filters.endDate || undefined,
			};

			const response = await receiptService.getReceiptHistory(apiFilters);

			setPageState({
				receipts: response.data.receipts,
				stats: response.data.stats,
				isLoading: false,
				error: null,
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Erreur lors du chargement de l'historique";

			setPageState((prev) => ({
				...prev,
				isLoading: false,
				error: errorMessage,
			}));

			toast.error(errorMessage);
		}
	}, [filters]);

	// ===== EFFETS =====

	/**
	 * Charge l'historique au montage et quand les filtres changent
	 */
	useEffect(() => {
		loadHistory();
	}, [loadHistory]);

	// ===== HANDLERS - FILTRES =====

	/**
	 * Met à jour le filtre de statut
	 */
	const handleStatusChange = (value: string) => {
		setFilters((prev) => ({
			...prev,
			status: value as ReceiptStatusFilter,
		}));
	};

	/**
	 * Met à jour l'ordre de tri
	 */
	const handleSortChange = (value: string) => {
		setFilters((prev) => ({
			...prev,
			sortOrder: value as ReceiptSortOrder,
		}));
	};

	/**
	 * Met à jour la recherche
	 */
	const handleSearchChange = (value: string) => {
		setFilters((prev) => ({ ...prev, searchQuery: value }));
	};

	/**
	 * Met à jour la date de début
	 */
	const handleStartDateChange = (value: string) => {
		setFilters((prev) => ({ ...prev, startDate: value }));
	};

	/**
	 * Met à jour la date de fin
	 */
	const handleEndDateChange = (value: string) => {
		setFilters((prev) => ({ ...prev, endDate: value }));
	};

	/**
	 * Réinitialise tous les filtres
	 */
	const handleResetFilters = () => {
		setFilters({
			status: 'ALL',
			sortOrder: 'NEWEST',
			searchQuery: '',
			startDate: '',
			endDate: '',
		});
	};

	// ===== HANDLERS - ACTIONS =====

	/**
	 * Navigue vers les détails d'un ticket
	 */
	const handleViewReceipt = useCallback(
		(receiptId: string) => {
			navigate({
				to: '/app/receipt/$receiptId/results',
				params: { receiptId },
			});
		},
		[navigate]
	);

	/**
	 * Supprime un ticket après confirmation
	 */
	const handleDeleteReceipt = useCallback(
		async (receiptId: string) => {
			// Confirmation de suppression
			const confirmed = window.confirm(
				'Êtes-vous sûr de vouloir supprimer ce ticket ? Cette action est irréversible.'
			);

			if (!confirmed) {
				return;
			}

			try {
				await receiptService.deleteReceipt(receiptId);

				toast.success('Ticket supprimé avec succès');

				// Recharger l'historique
				await loadHistory();
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: 'Erreur lors de la suppression';
				toast.error(errorMessage);
			}
		},
		[loadHistory]
	);

	// ===== RENDU DES SECTIONS =====

	/**
	 * Rendu de l'en-tête
	 */
	const renderHeader = () => (
		<div className='flex items-center justify-between mb-6'>
			<div className='flex items-center gap-3'>
				<Button
					variant='ghost'
					size='sm'
					onClick={() => navigate({ to: '/app/inventory' })}
					className='p-2'>
					<ArrowLeft className='size-4' />
				</Button>
				<div>
					<h1 className='text-2xl font-bold'>
						Historique des tickets
					</h1>
					<p className='text-sm text-muted-foreground'>
						Consultez tous vos tickets scannés
					</p>
				</div>
			</div>
		</div>
	);

	/**
	 * Rendu des statistiques
	 */
	const renderStats = () => {
		if (!pageState.stats) return null;

		return (
			<div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
				<Card>
					<CardContent className='p-4'>
						<div className='flex items-center gap-3'>
							<div className='size-10 rounded-lg bg-primary/10 flex items-center justify-center'>
								<Receipt className='size-5 text-primary' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>
									Total tickets
								</p>
								<p className='text-2xl font-bold'>
									{pageState.stats.totalReceipts}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className='p-4'>
						<div className='flex items-center gap-3'>
							<div className='size-10 rounded-lg bg-green-500/10 flex items-center justify-center'>
								<TrendingUp className='size-5 text-green-600' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>
									Validés
								</p>
								<p className='text-2xl font-bold'>
									{pageState.stats.completedReceipts}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className='p-4'>
						<div className='flex items-center gap-3'>
							<div className='size-10 rounded-lg bg-blue-500/10 flex items-center justify-center'>
								<Package className='size-5 text-blue-600' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>
									Articles ajoutés
								</p>
								<p className='text-2xl font-bold'>
									{pageState.stats.totalItemsAdded}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className='p-4'>
						<div className='flex items-center gap-3'>
							<div className='size-10 rounded-lg bg-yellow-500/10 flex items-center justify-center'>
								<DollarSign className='size-5 text-yellow-600' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>
									Montant total
								</p>
								<p className='text-2xl font-bold'>
									{formatAmount(pageState.stats.totalAmount)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	};

	/**
	 * Rendu des filtres
	 */
	const renderFilters = () => {
		const hasActiveFilters =
			filters.status !== 'ALL' ||
			filters.searchQuery !== '' ||
			filters.startDate !== '' ||
			filters.endDate !== '';

		return (
			<Card className='mb-6'>
				<CardHeader>
					<CardTitle className='text-lg flex items-center gap-2'>
						<Filter className='size-5' />
						Filtres
					</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					{/* Recherche et statut */}
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<Input
							placeholder='Rechercher par magasin...'
							value={filters.searchQuery}
							onChange={(e) => handleSearchChange(e.target.value)}
						/>

						<Select
							value={filters.status}
							onValueChange={handleStatusChange}>
							<SelectTrigger>
								<SelectValue placeholder='Statut' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='ALL'>
									Tous les statuts
								</SelectItem>
								<SelectItem value='PROCESSING'>
									En traitement
								</SelectItem>
								<SelectItem value='COMPLETED'>
									Complétés
								</SelectItem>
								<SelectItem value='VALIDATED'>
									Validés
								</SelectItem>
								<SelectItem value='FAILED'>Échecs</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Dates et tri */}
					<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
						<Input
							type='date'
							placeholder='Date de début'
							value={filters.startDate}
							onChange={(e) =>
								handleStartDateChange(e.target.value)
							}
						/>

						<Input
							type='date'
							placeholder='Date de fin'
							value={filters.endDate}
							onChange={(e) =>
								handleEndDateChange(e.target.value)
							}
						/>

						<Select
							value={filters.sortOrder}
							onValueChange={handleSortChange}>
							<SelectTrigger>
								<SelectValue placeholder='Trier par' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='NEWEST'>
									Plus récent
								</SelectItem>
								<SelectItem value='OLDEST'>
									Plus ancien
								</SelectItem>
								<SelectItem value='AMOUNT_HIGH'>
									Montant décroissant
								</SelectItem>
								<SelectItem value='AMOUNT_LOW'>
									Montant croissant
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Bouton reset */}
					{hasActiveFilters && (
						<Button
							variant='outline'
							size='sm'
							onClick={handleResetFilters}>
							Réinitialiser les filtres
						</Button>
					)}
				</CardContent>
			</Card>
		);
	};

	// ===== RENDU PRINCIPAL =====

	// Loading
	if (pageState.isLoading) {
		return (
			<div className='container mx-auto px-4 py-8'>
				<div className='max-w-6xl mx-auto'>
					{renderHeader()}
					<div className='flex items-center justify-center py-12'>
						<Loader2 className='size-8 animate-spin text-primary' />
					</div>
				</div>
			</div>
		);
	}

	// Erreur
	if (pageState.error) {
		return (
			<div className='container mx-auto px-4 py-8'>
				<div className='max-w-6xl mx-auto'>
					{renderHeader()}

					<Alert variant='destructive'>
						<AlertTriangle className='size-4' />
						<AlertDescription>{pageState.error}</AlertDescription>
					</Alert>

					<div className='mt-4'>
						<Button variant='outline' onClick={() => loadHistory()}>
							Réessayer
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='container mx-auto px-4 py-8'>
			<div className='max-w-6xl mx-auto'>
				{/* Header */}
				{renderHeader()}

				{/* Statistiques */}
				{renderStats()}

				{/* Filtres */}
				{renderFilters()}

				{/* Liste */}
				<div className='mb-6'>
					<div className='flex items-center justify-between mb-4'>
						<h2 className='text-lg font-semibold'>
							{pageState.receipts.length} ticket
							{pageState.receipts.length > 1 ? 's' : ''}
						</h2>
					</div>

					<ReceiptHistoryList
						receipts={pageState.receipts}
						onViewReceipt={handleViewReceipt}
						onDeleteReceipt={handleDeleteReceipt}
					/>
				</div>
			</div>
		</div>
	);
};

export default ReceiptHistoryPage;
