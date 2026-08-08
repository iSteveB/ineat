import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import {
	ArrowLeft,
	AlertTriangle,
	Check,
	ChevronDown,
	FileText,
	Loader2,
	Package,
	Save,
	RotateCcw,
	Upload,
	X
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
	invoiceService,
	type Invoice,
	type InvoiceItem,
	type UpdateInvoiceItemInput,
	type ValidateInvoiceResponse
} from '@/services/invoiceService';
import { inventoryService } from '@/services/inventoryService';
import { useAuthStore } from '@/stores/authStore';
import { useInventoryActions } from '@/stores/inventoryStore';
import { STORAGE_LOCATION_OPTIONS } from '@/constants/inventory';

export const Route = createFileRoute('/app/inventory/add/drive')({
	validateSearch: z.object({
		invoiceId: z.string().uuid().optional()
	}),
	component: DriveInvoiceImportPage
});

type FlowStep = 'upload' | 'processing' | 'review' | 'done';
const NO_STORAGE_VALUE = '__none__';

const TERMINAL_PROCESSING_STAGES = new Set([
	'READY_FOR_REVIEW',
	'FAILED',
	'VALIDATED'
]);

const PROCESSING_STEPS = [
	{ stage: 'UPLOADED', label: 'Fichier reçu' },
	{ stage: 'EXTRACTING', label: 'Lecture' },
	{ stage: 'ANALYZING', label: 'Analyse des articles' },
	{ stage: 'ENRICHING', label: 'Enrichissement' },
	{ stage: 'READY_FOR_REVIEW', label: 'Prête à vérifier' }
] as const;

const PROCESSING_STAGE_ORDER: Record<string, number> = {
	UPLOADED: 0,
	QUEUED: 0,
	EXTRACTING: 1,
	ANALYZING: 2,
	NORMALIZING: 2,
	ENRICHING: 3,
	READY_FOR_REVIEW: 4,
	VALIDATED: 4
};

type InvoiceItemDraft = Pick<
	InvoiceItem,
	| 'detectedName'
	| 'quantity'
	| 'unitPrice'
	| 'totalPrice'
	| 'category'
	| 'expiryDate'
	| 'storageLocation'
	| 'notes'
	| 'selectedEan'
	| 'productId'
>;

const formatCurrency = (amount?: number | null): string =>
	typeof amount === 'number'
		? amount.toLocaleString('fr-FR', {
				style: 'currency',
				currency: 'EUR'
			})
		: '-';

const formatDate = (date?: string | null): string =>
	date ? new Intl.DateTimeFormat('fr-FR').format(new Date(date)) : '-';

const roundCurrency = (value: number): number => Math.round(value * 100) / 100;

const getLineTotal = (draft: InvoiceItemDraft): number | undefined =>
	typeof draft.totalPrice === 'number'
		? draft.totalPrice
		: typeof draft.quantity === 'number' && typeof draft.unitPrice === 'number'
			? roundCurrency(draft.quantity * draft.unitPrice)
			: undefined;

const normalizeDraftQuantity = (value: unknown): number => {
	const numericValue =
		typeof value === 'number'
			? value
			: typeof value === 'string'
				? Number(value.replace(',', '.'))
				: NaN;

	return Number.isFinite(numericValue) && numericValue > 0
		? Math.max(1, Math.round(numericValue))
		: 1;
};

const normalizeStorageSelectValue = (value?: string | null): string =>
	value && (STORAGE_LOCATION_OPTIONS as readonly string[]).includes(value)
		? value
		: NO_STORAGE_VALUE;

const createDraft = (item: InvoiceItem): InvoiceItemDraft => ({
	detectedName: item.detectedName,
	quantity: normalizeDraftQuantity(item.quantity),
	unitPrice: item.unitPrice,
	totalPrice: item.totalPrice,
	category: item.category,
	expiryDate: item.expiryDate,
	storageLocation: item.storageLocation,
	notes: item.notes,
	selectedEan: item.selectedEan,
	productId: item.productId
});

const getAssociationValue = (draft: InvoiceItemDraft): string => {
	if (draft.productId) {
		return `product:${draft.productId}`;
	}

	if (draft.selectedEan) {
		return `ean:${draft.selectedEan}`;
	}

	return 'new';
};

const getSuggestedEans = (item: InvoiceItem): string[] =>
	Array.isArray(item.suggestedEans) ? item.suggestedEans : [];

const getItemImageUrl = (item: InvoiceItem): string | null =>
	item.externalProductData?.imageUrl ?? null;

const getReviewStatus = (item: InvoiceItem) => {
	if (item.validated) {
		return { label: 'Déjà validé', variant: 'secondary' as const };
	}

	if (item.externalProductStatus === 'FOUND' && item.confidence >= 0.75) {
		return { label: 'Enrichi automatiquement', variant: 'success' as const };
	}

	if (item.externalProductStatus === 'ERROR') {
		return {
			label: 'OFF indisponible · à vérifier',
			variant: 'warning' as const
		};
	}

	if (item.externalProductStatus === 'NOT_FOUND') {
		return { label: 'Absent d’OpenFoodFacts', variant: 'warning' as const };
	}

	if (item.externalProductStatus === 'SKIPPED') {
		return { label: 'Sans EAN · à vérifier', variant: 'warning' as const };
	}

	return { label: 'Informations incomplètes', variant: 'warning' as const };
};

const formatProductScore = (score?: string | null): string =>
	score ?? 'Information non disponible';

function DriveInvoiceImportPage() {
	const navigate = useNavigate();
	const { invoiceId } = Route.useSearch();
	const queryClient = useQueryClient();
	const { user, getProfile } = useAuthStore();
	const { fetchInventoryItems } = useInventoryActions();
	const [step, setStep] = useState<FlowStep>('upload');
	const [invoice, setInvoice] = useState<Invoice | null>(null);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [drafts, setDrafts] = useState<Record<string, InvoiceItemDraft>>({});
	const [result, setResult] = useState<ValidateInvoiceResponse | null>(null);
	const [localError, setLocalError] = useState<string | null>(null);
	const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
	const [pendingInvoiceFile, setPendingInvoiceFile] = useState<File | null>(
		null
	);

	const invoiceQuery = useQuery({
		queryKey: ['invoice', invoiceId],
		queryFn: () => invoiceService.getInvoice(invoiceId!),
		enabled: Boolean(invoiceId),
		refetchInterval: (query) => {
			const stage = query.state.data?.processingStage;
			return stage && TERMINAL_PROCESSING_STAGES.has(stage) ? false : 2000;
		},
		refetchIntervalInBackground: true,
		retry: 3
	});

	useEffect(() => {
		const restoredInvoice = invoiceQuery.data;

		if (!restoredInvoice) {
			if (invoiceId) {
				setStep('processing');
			}
			return;
		}

		setInvoice(restoredInvoice);

		if (restoredInvoice.processingStage === 'FAILED') {
			setStep('processing');
			return;
		}

		if (restoredInvoice.processingStage === 'VALIDATED') {
			setStep('done');
			return;
		}

		if (restoredInvoice.processingStage !== 'READY_FOR_REVIEW') {
			setStep('processing');
			return;
		}

		setDrafts(
			Object.fromEntries(
				restoredInvoice.items.map((item) => [item.id, createDraft(item)])
			)
		);
		setSelectedIds(
			new Set(
				restoredInvoice.items
					.filter((item) => !item.validated)
					.map((item) => item.id)
			)
		);
		setStep('review');
	}, [invoiceId, invoiceQuery.data]);

	const { data: categories = [], isLoading: categoriesLoading } = useQuery({
		queryKey: ['categories'],
		queryFn: inventoryService.getCategories,
		staleTime: 1000 * 60 * 60
	});

	const hasDriveAccess = Boolean(user?.capabilities.canImportDrive);
	const driveImportsRemaining = user?.capabilities.driveImportsRemaining ?? 0;
	const canImportDrive = hasDriveAccess && driveImportsRemaining > 0;

	const selectedItems = useMemo(
		() =>
			invoice?.items.filter(
				(item) => selectedIds.has(item.id) && !item.validated
			) ?? [],
		[invoice, selectedIds]
	);

	const importMutation = useMutation({
		mutationFn: invoiceService.importDriveInvoice,
		onSuccess: (importedInvoice) => {
			setInvoice(importedInvoice);
			setExpandedItemId(null);
			setStep('processing');
			void navigate({
				to: '/app/inventory/add/drive',
				search: { invoiceId: importedInvoice.id },
				replace: true
			});
			toast.success('Facture reçue, analyse lancée');
			void getProfile().catch(() => undefined);
		},
		onError: (error: Error) => {
			setLocalError(error.message);
			toast.error(error.message);
		}
	});

	const updateItemMutation = useMutation({
		mutationFn: ({
			itemId,
			data
		}: {
			itemId: string;
			data: UpdateInvoiceItemInput;
		}) => {
			if (!invoice) {
				throw new Error('Facture introuvable');
			}
			return invoiceService.updateInvoiceItem(invoice.id, itemId, data);
		},
		onSuccess: (updatedItem) => {
			setInvoice((current) =>
				current
					? {
							...current,
							items: current.items.map((item) =>
								item.id === updatedItem.id ? updatedItem : item
							)
						}
					: current
			);
			setDrafts((current) => ({
				...current,
				[updatedItem.id]: createDraft(updatedItem)
			}));
			toast.success('Ligne mise à jour');
		},
		onError: (error: Error) => toast.error(error.message)
	});

	const validateMutation = useMutation({
		mutationFn: () => {
			if (!invoice) {
				throw new Error('Facture introuvable');
			}
			return invoiceService.validateInvoice(
				invoice.id,
				selectedItems.map((item) => item.id)
			);
		},
		onSuccess: async (validationResult) => {
			setResult(validationResult);
			setStep('done');
			await Promise.all([
				fetchInventoryItems(),
				queryClient.invalidateQueries({ queryKey: ['inventory'] }),
				queryClient.invalidateQueries({ queryKey: ['budget', 'current'] }),
				queryClient.invalidateQueries({ queryKey: ['budget', 'stats'] })
			]);
			toast.success('Produits ajoutés');
		},
		onError: (error: Error) => toast.error(error.message)
	});

	const retryMutation = useMutation({
		mutationFn: () => {
			if (!invoice) {
				throw new Error('Facture introuvable');
			}
			return invoiceService.retryInvoice(invoice.id);
		},
		onSuccess: (retriedInvoice) => {
			setInvoice(retriedInvoice);
			queryClient.setQueryData(['invoice', retriedInvoice.id], retriedInvoice);
			toast.success('Nouvelle tentative lancée');
		},
		onError: () => {
			toast.error("L’analyse ne peut pas être relancée pour le moment.");
		}
	});

	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		setLocalError(null);

		if (!file) {
			return;
		}

		setPendingInvoiceFile(file);
		event.target.value = '';
	};

	const handleConfirmFileAnalysis = () => {
		if (!pendingInvoiceFile) {
			return;
		}

		importMutation.mutate(pendingInvoiceFile);
		setPendingInvoiceFile(null);
	};

	const handleCancelFileAnalysis = () => {
		setPendingInvoiceFile(null);
		setLocalError(null);
	};

	const updateDraft = (
		itemId: string,
		field: keyof InvoiceItemDraft,
		value: string
	) => {
		setDrafts((current) => {
			const currentDraft = current[itemId];
			const parsedValue =
				field === 'quantity'
					? value === ''
						? undefined
						: normalizeDraftQuantity(value)
					: field === 'unitPrice' || field === 'totalPrice'
						? value === ''
							? undefined
							: Number(value)
						: value || null;
			const nextDraft = {
				...currentDraft,
				[field]: parsedValue
			};

			if (field === 'quantity' || field === 'unitPrice') {
				nextDraft.totalPrice =
					typeof nextDraft.quantity === 'number' &&
					typeof nextDraft.unitPrice === 'number'
						? roundCurrency(nextDraft.quantity * nextDraft.unitPrice)
						: undefined;
			}

			return {
				...current,
				[itemId]: nextDraft
			};
		});
	};

	const updateAssociation = (itemId: string, value: string) => {
		setDrafts((current) => {
			const draft = current[itemId];

			if (!draft) {
				return current;
			}

			if (value === 'new') {
				return {
					...current,
					[itemId]: {
						...draft,
						productId: null,
						selectedEan: null
					}
				};
			}

			if (value.startsWith('product:')) {
				return {
					...current,
					[itemId]: {
						...draft,
						productId: value.replace('product:', ''),
						selectedEan: null
					}
				};
			}

			return {
				...current,
				[itemId]: {
					...draft,
					productId: null,
					selectedEan: value.replace('ean:', '')
				}
			};
		});
	};

	const saveDraft = (item: InvoiceItem) => {
		const draft = drafts[item.id];

		if (!draft) {
			return;
		}

		updateItemMutation.mutate({
			itemId: item.id,
			data: {
				detectedName: draft.detectedName,
				quantity: draft.quantity,
				unitPrice: draft.unitPrice ?? undefined,
				totalPrice: getLineTotal(draft),
				category: draft.category ?? undefined,
				productId:
					draft.productId === null ? null : (draft.productId ?? undefined),
				expiryDate: draft.expiryDate ?? undefined,
				storageLocation:
					draft.storageLocation === null
						? ''
						: (draft.storageLocation ?? undefined),
				notes: draft.notes ?? undefined,
				selectedEan:
					draft.selectedEan === null ? null : (draft.selectedEan ?? undefined)
			}
		});
	};

	const toggleItem = (itemId: string) => {
		setSelectedIds((current) => {
			const next = new Set(current);
			if (next.has(itemId)) {
				next.delete(itemId);
			} else {
				next.add(itemId);
			}
			return next;
		});
	};

	return (
		<div className="min-h-screen bg-neutral-50">
			<div className="border-b border-neutral-200 bg-neutral-50">
				<div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4">
					<Link to="/app/inventory/add">
						<Button
							variant="ghost"
							size="sm"
							className="size-10 p-0 rounded-xl border border-neutral-200 bg-neutral-50"
						>
							<ArrowLeft className="size-5 text-neutral-300" />
						</Button>
					</Link>
					<div className="min-w-0 flex-1">
						<h1 className="text-2xl font-bold text-neutral-300">
							Facture Drive
						</h1>
						<p className="text-sm text-neutral-200">
							{driveImportsRemaining} import
							{driveImportsRemaining > 1 ? 's' : ''} restant
							{driveImportsRemaining > 1 ? 's' : ''}
						</p>
					</div>
					<Badge variant={canImportDrive ? 'default' : 'secondary'}>
						{canImportDrive ? 'Premium actif' : 'Indisponible'}
					</Badge>
				</div>
			</div>

			<main className="mx-auto max-w-6xl px-4 py-6">
				{!canImportDrive && !invoiceId && (
					<Card className="border-neutral-200 bg-neutral-50">
						<CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h2 className="text-lg font-semibold text-neutral-300">
									Import non disponible
								</h2>
								<p className="mt-1 text-sm text-neutral-200">
									{hasDriveAccess
										? 'Quota Drive atteint pour la période en cours.'
										: 'Cette action nécessite Premium.'}
								</p>
							</div>
							<Button onClick={() => navigate({ to: '/app/subscription' })}>
								Voir mon abonnement
							</Button>
						</CardContent>
					</Card>
				)}

				{canImportDrive && step === 'upload' && (
					<Card className="border-neutral-200 bg-neutral-50">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-neutral-300">
								<FileText className="size-5" />
								Importer une facture
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{pendingInvoiceFile ? (
								<div className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-lg border border-neutral-200 bg-white p-6 text-center">
									<FileText className="size-8 text-primary-50" />
									<div className="max-w-full">
										<p className="text-base font-medium text-neutral-300">
											Analyser ce fichier ?
										</p>
										<p className="mt-1 max-w-full truncate text-sm text-neutral-200">
											{pendingInvoiceFile.name}
										</p>
									</div>
									<div className="flex flex-col gap-2 sm:flex-row">
										<Button
											type="button"
											onClick={handleConfirmFileAnalysis}
											disabled={importMutation.isPending}
										>
											<Check className="mr-2 size-4" />
											Valider
										</Button>
										<Button
											type="button"
											variant="outline"
											onClick={handleCancelFileAnalysis}
											disabled={importMutation.isPending}
										>
											<X className="mr-2 size-4" />
											Annuler
										</Button>
									</div>
								</div>
							) : (
								<label className="flex min-h-56 cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-neutral-200 bg-white p-6 text-center transition-colors hover:bg-neutral-100">
									{importMutation.isPending ? (
										<Loader2 className="size-8 animate-spin text-primary-50" />
									) : (
										<Upload className="size-8 text-primary-50" />
									)}
									<div>
										<p className="text-base font-medium text-neutral-300">
											{importMutation.isPending
												? 'Analyse en cours...'
												: 'Charger un PDF'}
										</p>
										<p className="mt-1 text-sm text-neutral-200">
											PDF, 5 Mo max
										</p>
									</div>
									<input
										type="file"
										accept="application/pdf,.pdf"
										onChange={handleFileChange}
										disabled={importMutation.isPending}
										className="sr-only"
									/>
								</label>
							)}

							{localError && (
								<Alert variant="error">
									<AlertDescription>{localError}</AlertDescription>
								</Alert>
							)}
						</CardContent>
					</Card>
				)}

				{step === 'processing' && (
					<InvoiceProcessingCard
						invoice={invoice}
						isLoading={invoiceQuery.isLoading}
						isFetchError={invoiceQuery.isError}
						onRefresh={() => void invoiceQuery.refetch()}
						onRetry={() => retryMutation.mutate()}
						isRetrying={retryMutation.isPending}
					/>
				)}

				{step === 'review' && invoice && (
					<div className="space-y-4">
						<Card className="border-neutral-200 bg-neutral-50">
							<CardContent className="grid gap-4 p-4 sm:grid-cols-4">
								<div>
									<p className="text-xs uppercase text-neutral-200">Marchand</p>
									<p className="font-medium text-neutral-300">
										{invoice.merchantName ?? '-'}
									</p>
								</div>
								<div>
									<p className="text-xs uppercase text-neutral-200">Date</p>
									<p className="font-medium text-neutral-300">
										{formatDate(invoice.purchaseDate)}
									</p>
								</div>
								<div>
									<p className="text-xs uppercase text-neutral-200">Total</p>
									<p className="font-medium text-neutral-300">
										{formatCurrency(invoice.totalAmount)}
									</p>
								</div>
								<div>
									<p className="text-xs uppercase text-neutral-200">Statut</p>
									<p className="font-medium text-neutral-300">
										{invoice.status}
									</p>
								</div>
							</CardContent>
						</Card>

						<Card className="border-neutral-200 bg-neutral-50">
							<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<CardTitle className="text-neutral-300">
									Lignes détectées
								</CardTitle>
								<Button
									onClick={() => validateMutation.mutate()}
									disabled={
										selectedItems.length === 0 || validateMutation.isPending
									}
								>
									{validateMutation.isPending ? (
										<Loader2 className="mr-2 size-4 animate-spin" />
									) : (
										<Check className="mr-2 size-4" />
									)}
									Valider {selectedItems.length}
								</Button>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{invoice.items.map((item) => {
										const draft = drafts[item.id] ?? createDraft(item);
										const isSelected = selectedIds.has(item.id);
										const isExpanded = expandedItemId === item.id;
										const suggestedEans = getSuggestedEans(item);
										const imageUrl = getItemImageUrl(item);
										const reviewStatus = getReviewStatus(item);

										return (
											<div
												key={item.id}
												className="overflow-hidden rounded-lg border border-neutral-200 bg-white transition-shadow hover:shadow-md"
												data-state={isSelected ? 'selected' : undefined}
											>
												<div className="flex items-stretch">
													<label className="flex w-12 shrink-0 cursor-pointer items-center justify-center border-r border-neutral-100">
														<input
															type="checkbox"
															checked={isSelected}
															disabled={item.validated}
															onChange={() => toggleItem(item.id)}
															className="size-4"
															aria-label={`Sélectionner ${draft.detectedName}`}
														/>
													</label>
													<button
														type="button"
														aria-expanded={isExpanded}
														onClick={() =>
															setExpandedItemId((current) =>
																current === item.id ? null : item.id
															)
														}
														className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left transition-colors hover:bg-neutral-100 sm:gap-4"
													>
														<div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
															{imageUrl ? (
																<img
																	src={imageUrl}
																	alt={draft.detectedName}
																	className="size-full object-cover"
																/>
															) : (
																<Package className="size-6 text-neutral-200" />
															)}
														</div>
														<div className="min-w-0 flex-1">
															<p className="truncate font-semibold text-neutral-300">
																{draft.detectedName || 'Produit sans nom'}
															</p>
															<p className="mt-1 text-xs text-neutral-200">
																{item.validated
																	? 'Déjà validé'
																	: isSelected
																		? 'Sélectionné'
																		: 'Ignoré à la validation'}
															</p>
															<Badge
																variant={reviewStatus.variant}
																className="mt-2 w-fit"
															>
																{reviewStatus.variant === 'warning' && (
																	<AlertTriangle className="mr-1 size-3" />
																)}
																{reviewStatus.label}
															</Badge>
														</div>
														<div className="grid shrink-0 grid-cols-2 gap-2 text-right sm:min-w-44">
															<div>
																<p className="text-xs uppercase text-neutral-200">
																	Qté
																</p>
																<p className="font-semibold text-neutral-300">
																	{draft.quantity ?? '-'}
																</p>
															</div>
															<div>
																<p className="text-xs uppercase text-neutral-200">
																	Prix
																</p>
																<p className="font-semibold text-neutral-300">
																	{formatCurrency(getLineTotal(draft))}
																</p>
															</div>
														</div>
														<ChevronDown
															className={`size-5 shrink-0 text-neutral-200 transition-transform ${
																isExpanded ? 'rotate-180' : ''
															}`}
														/>
													</button>
												</div>

												{isExpanded && (
													<div className="border-t border-neutral-100 p-4">
														{item.externalProductData && (
															<div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-100 p-4">
																<p className="text-sm font-semibold text-neutral-300">
																	Données OpenFoodFacts disponibles
																</p>
																<div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
																	<div>
																		<span className="text-neutral-200">
																			Nom
																		</span>
																		<p className="font-medium text-neutral-300">
																			{item.externalProductData.name ??
																				'Information non disponible'}
																		</p>
																	</div>
																	<div>
																		<span className="text-neutral-200">
																			Marque
																		</span>
																		<p className="font-medium text-neutral-300">
																			{item.externalProductData.brand ??
																				'Information non disponible'}
																		</p>
																	</div>
																	<div>
																		<span className="text-neutral-200">
																			Nutri-score
																		</span>
																		<p className="font-medium text-neutral-300">
																			{formatProductScore(
																				item.externalProductData.nutriscore
																			)}
																		</p>
																	</div>
																	<div>
																		<span className="text-neutral-200">
																			Eco-score
																		</span>
																		<p className="font-medium text-neutral-300">
																			{formatProductScore(
																				item.externalProductData.ecoscore
																			)}
																		</p>
																	</div>
																	<div>
																		<span className="text-neutral-200">
																			NOVA
																		</span>
																		<p className="font-medium text-neutral-300">
																			{formatProductScore(
																				item.externalProductData.novascore
																			)}
																		</p>
																	</div>
																	<div className="sm:col-span-2 lg:col-span-3">
																		<span className="text-neutral-200">
																			Ingrédients
																		</span>
																		<p className="font-medium text-neutral-300">
																			{item.externalProductData.ingredients ??
																				'Information non disponible'}
																		</p>
																	</div>
																</div>
															</div>
														)}
														<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
															<div className="space-y-1.5 md:col-span-2 lg:col-span-1">
																<label className="text-xs font-medium uppercase text-neutral-200">
																	Produit
																</label>
																<Input
																	value={draft.detectedName ?? ''}
																	onChange={(event) =>
																		updateDraft(
																			item.id,
																			'detectedName',
																			event.target.value
																		)
																	}
																	disabled={item.validated}
																/>
															</div>
															<div className="space-y-1.5">
																<label className="text-xs font-medium uppercase text-neutral-200">
																	Quantité
																</label>
																<Input
																	type="number"
																	min="1"
																	step="1"
																	value={draft.quantity ?? ''}
																	onChange={(event) =>
																		updateDraft(
																			item.id,
																			'quantity',
																			event.target.value
																		)
																	}
																	disabled={item.validated}
																/>
															</div>
															<div className="space-y-1.5">
																<label className="text-xs font-medium uppercase text-neutral-200">
																	Prix unitaire TTC
																</label>
																<Input
																	type="number"
																	min="0"
																	step="0.01"
																	value={draft.unitPrice ?? ''}
																	onChange={(event) =>
																		updateDraft(
																			item.id,
																			'unitPrice',
																			event.target.value
																		)
																	}
																	disabled={item.validated}
																/>
															</div>
															<div className="space-y-1.5">
																<label className="text-xs font-medium uppercase text-neutral-200">
																	Total ligne
																</label>
																<Input
																	type="number"
																	min="0"
																	step="0.01"
																	value={draft.totalPrice ?? ''}
																	onChange={(event) =>
																		updateDraft(
																			item.id,
																			'totalPrice',
																			event.target.value
																		)
																	}
																	disabled={item.validated}
																/>
															</div>
															<div className="space-y-1.5">
																<label className="text-xs font-medium uppercase text-neutral-200">
																	Association
																</label>
																<Select
																	value={getAssociationValue(draft)}
																	onValueChange={(value) =>
																		updateAssociation(item.id, value)
																	}
																	disabled={item.validated}
																>
																	<SelectTrigger className="w-full">
																		<SelectValue />
																	</SelectTrigger>
																	<SelectContent>
																		<SelectItem value="new">
																			Nouveau produit
																		</SelectItem>
																		{item.product && (
																			<SelectItem
																				value={`product:${item.product.id}`}
																			>
																				{item.product.name}
																			</SelectItem>
																		)}
																		{suggestedEans.map((ean) => (
																			<SelectItem
																				key={ean}
																				value={`ean:${ean}`}
																			>
																				EAN {ean}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
																{item.product ? (
																	<p className="text-xs text-neutral-200">
																		Produit connu
																		{item.product.barcode
																			? ` · ${item.product.barcode}`
																			: ''}
																	</p>
																) : suggestedEans.length > 0 ? (
																	<p className="text-xs text-warning-50">
																		{suggestedEans.length} EAN proposé
																		{suggestedEans.length > 1 ? 's' : ''}
																	</p>
																) : (
																	<p className="text-xs text-neutral-200">
																		Création à la validation
																	</p>
																)}
																<Input
																	inputMode="numeric"
																	placeholder="EAN (8 à 13 chiffres)"
																	value={draft.selectedEan ?? ''}
																	onChange={(event) =>
																		updateDraft(
																			item.id,
																			'selectedEan',
																			event.target.value
																		)
																	}
																	disabled={item.validated}
																/>
															</div>
															<div className="space-y-1.5">
																<label className="text-xs font-medium uppercase text-neutral-200">
																	Catégorie
																</label>
																<Select
																	value={draft.category ?? undefined}
																	onValueChange={(value) =>
																		updateDraft(item.id, 'category', value)
																	}
																	disabled={item.validated || categoriesLoading}
																>
																	<SelectTrigger className="w-full">
																		<SelectValue placeholder="Catégorie" />
																	</SelectTrigger>
																	<SelectContent>
																		{categories.map((category) => (
																			<SelectItem
																				key={category.id}
																				value={category.slug}
																			>
																				{category.name}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															</div>
															<div className="space-y-1.5">
																<label className="text-xs font-medium uppercase text-neutral-200">
																	Stockage
																</label>
																<Select
																	value={normalizeStorageSelectValue(
																		draft.storageLocation
																	)}
																	onValueChange={(value) =>
																		updateDraft(
																			item.id,
																			'storageLocation',
																			value === NO_STORAGE_VALUE ? '' : value
																		)
																	}
																	disabled={item.validated}
																>
																	<SelectTrigger className="w-full">
																		<SelectValue placeholder="Stockage" />
																	</SelectTrigger>
																	<SelectContent>
																		<SelectItem value={NO_STORAGE_VALUE}>
																			Non renseigné
																		</SelectItem>
																		{STORAGE_LOCATION_OPTIONS.map(
																			(location) => (
																				<SelectItem
																					key={location}
																					value={location}
																				>
																					{location}
																				</SelectItem>
																			)
																		)}
																	</SelectContent>
																</Select>
															</div>
															<div className="space-y-1.5">
																<label className="text-xs font-medium uppercase text-neutral-200">
																	Date d'expiration
																</label>
																<Input
																	type="date"
																	value={draft.expiryDate?.slice(0, 10) ?? ''}
																	onChange={(event) =>
																		updateDraft(
																			item.id,
																			'expiryDate',
																			event.target.value
																		)
																	}
																	disabled={item.validated}
																/>
															</div>
															<div className="space-y-1.5 md:col-span-2">
																<label className="text-xs font-medium uppercase text-neutral-200">
																	Notes
																</label>
																<Textarea
																	value={draft.notes ?? ''}
																	onChange={(event) =>
																		updateDraft(
																			item.id,
																			'notes',
																			event.target.value
																		)
																	}
																	disabled={item.validated}
																	placeholder="Optionnel"
																/>
															</div>
														</div>
														<div className="mt-4 flex justify-end">
															<Button
																type="button"
																variant="outline"
																size="sm"
																disabled={
																	item.validated || updateItemMutation.isPending
																}
																onClick={() => saveDraft(item)}
															>
																{updateItemMutation.isPending ? (
																	<Loader2 className="mr-2 size-4 animate-spin" />
																) : (
																	<Save className="mr-2 size-4" />
																)}
																Enregistrer la ligne
															</Button>
														</div>
													</div>
												)}
											</div>
										);
									})}
								</div>
							</CardContent>
						</Card>
					</div>
				)}

				{step === 'done' && (result || invoice) && (
					<Card className="border-neutral-200 bg-neutral-50">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-neutral-300">
								<Check className="size-5 text-success-50" />
								Import terminé
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-5">
							{result && <div className="grid gap-3 sm:grid-cols-4">
								<SummaryCell
									label="Produits"
									value={String(result.inventoryItemCount)}
								/>
								<SummaryCell
									label="Dépenses"
									value={String(result.expenseCount)}
								/>
								<SummaryCell
									label="Ignorées"
									value={String(result.skippedItemCount)}
								/>
								<SummaryCell
									label="Budget"
									value={formatCurrency(result.totalBudgetAmount)}
								/>
							</div>}
							<div className="flex flex-col gap-3 sm:flex-row">
								<Button onClick={() => navigate({ to: '/app/inventory' })}>
									Retour à l’inventaire
								</Button>
								<Button
									variant="outline"
									onClick={() => {
										void navigate({
											to: '/app/inventory/add/drive',
											search: {},
											replace: true
										});
										setStep('upload');
										setInvoice(null);
										setResult(null);
										setDrafts({});
										setSelectedIds(new Set());
										setExpandedItemId(null);
									}}
								>
									<X className="mr-2 size-4" />
									Nouvel import
								</Button>
							</div>
						</CardContent>
					</Card>
				)}
			</main>
		</div>
	);
}

function SummaryCell({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-md border border-neutral-200 bg-white p-4">
			<p className="text-xs uppercase text-neutral-200">{label}</p>
			<p className="mt-1 text-lg font-semibold text-neutral-300">{value}</p>
		</div>
	);
}

function InvoiceProcessingCard({
	invoice,
	isLoading,
	isFetchError,
	onRefresh,
	onRetry,
	isRetrying
}: {
	invoice: Invoice | null;
	isLoading: boolean;
	isFetchError: boolean;
	onRefresh: () => void;
	onRetry: () => void;
	isRetrying: boolean;
}) {
	const stage = invoice?.processingStage;
	const isFailed = stage === 'FAILED';
	const currentStageIndex = stage ? (PROCESSING_STAGE_ORDER[stage] ?? 0) : 0;
	const progress = invoice?.processingProgress ?? 0;

	return (
		<Card className="border-neutral-200 bg-neutral-50">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-neutral-300">
					{isFailed ? (
						<AlertTriangle className="size-5 text-warning-50" />
					) : (
						<Loader2 className="size-5 animate-spin text-primary-50" />
					)}
					{isFailed ? 'Analyse interrompue' : 'Analyse de la facture'}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				<div aria-live="polite" role="status">
					<p className="font-medium text-neutral-300">
						{isFailed
							? "La facture n’a pas pu être analysée. Vous pouvez relancer un import."
							: isFetchError
								? 'La mise à jour est momentanément indisponible. Le traitement continue en arrière-plan.'
								: isLoading
									? 'Récupération de la progression…'
									: 'Vous pouvez quitter cette page : le traitement continuera.'}
					</p>
					{!isFailed && (
						<p className="mt-1 text-sm text-neutral-200">
							Progression {progress} %
						</p>
					)}
				</div>

				<div
					className="h-2 overflow-hidden rounded-full bg-neutral-100"
					role="progressbar"
					aria-label="Progression de l’analyse"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={progress}
				>
					<div
						className="h-full rounded-full bg-primary-50 transition-[width] duration-500"
						style={{ width: `${progress}%` }}
					/>
				</div>

				<ol className="grid gap-3 sm:grid-cols-5">
					{PROCESSING_STEPS.map((processingStep, index) => {
						const isComplete = !isFailed && index < currentStageIndex;
						const isCurrent = !isFailed && index === currentStageIndex;

						return (
							<li
								key={processingStep.stage}
								className={`rounded-lg border p-3 text-sm ${
									isCurrent
										? 'border-primary-50 bg-white text-neutral-300'
										: 'border-neutral-200 text-neutral-200'
								}`}
								aria-current={isCurrent ? 'step' : undefined}
							>
								<span className="mb-2 flex size-6 items-center justify-center rounded-full border border-current">
									{isComplete ? <Check className="size-4" /> : index + 1}
								</span>
								{processingStep.label}
							</li>
						);
					})}
				</ol>

				<div className="flex flex-col gap-3 sm:flex-row">
					{isFetchError && !isFailed && (
						<Button type="button" variant="outline" onClick={onRefresh}>
							<RotateCcw className="mr-2 size-4" />
							Actualiser
						</Button>
					)}
					{isFailed && (
						<Button type="button" onClick={onRetry} disabled={isRetrying}>
							{isRetrying ? (
								<Loader2 className="mr-2 size-4 animate-spin" />
							) : (
								<RotateCcw className="mr-2 size-4" />
							)}
							Relancer l’analyse
						</Button>
					)}
					<Button asChild type="button" variant="outline">
						<Link to="/app/inventory">Quitter</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
