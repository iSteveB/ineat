import { ChangeEvent, useMemo, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
	ArrowLeft,
	Check,
	ChevronDown,
	FileText,
	Loader2,
	Package,
	Save,
	Upload,
	X,
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
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
	invoiceService,
	type Invoice,
	type InvoiceItem,
	type UpdateInvoiceItemInput,
	type ValidateInvoiceResponse,
} from '@/services/invoiceService';
import { inventoryService } from '@/services/inventoryService';
import { useAuthStore } from '@/stores/authStore';
import { STORAGE_LOCATION_OPTIONS } from '@/constants/inventory';

export const Route = createFileRoute('/app/inventory/add/drive')({
	component: DriveInvoiceImportPage,
});

type FlowStep = 'upload' | 'review' | 'done';
const NO_STORAGE_VALUE = '__none__';

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
				currency: 'EUR',
			})
		: '-';

const formatDate = (date?: string | null): string =>
	date ? new Intl.DateTimeFormat('fr-FR').format(new Date(date)) : '-';

const roundCurrency = (value: number): number => Math.round(value * 100) / 100;

const getLineTotal = (draft: InvoiceItemDraft): number | undefined =>
	typeof draft.quantity === 'number' && typeof draft.unitPrice === 'number'
		? roundCurrency(draft.quantity * draft.unitPrice)
		: draft.totalPrice ?? undefined;

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
	productId: item.productId,
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

function DriveInvoiceImportPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user, getProfile } = useAuthStore();
	const [step, setStep] = useState<FlowStep>('upload');
	const [invoice, setInvoice] = useState<Invoice | null>(null);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [drafts, setDrafts] = useState<Record<string, InvoiceItemDraft>>({});
	const [result, setResult] = useState<ValidateInvoiceResponse | null>(null);
	const [localError, setLocalError] = useState<string | null>(null);
	const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

	const { data: categories = [], isLoading: categoriesLoading } = useQuery({
		queryKey: ['categories'],
		queryFn: inventoryService.getCategories,
		staleTime: 1000 * 60 * 60,
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
			setDrafts(
				Object.fromEntries(
					importedInvoice.items.map((item) => [item.id, createDraft(item)])
				)
			);
			setSelectedIds(
				new Set(
					importedInvoice.items
						.filter((item) => !item.validated)
						.map((item) => item.id)
				)
			);
			setExpandedItemId(null);
			setStep('review');
			toast.success('Facture analysée');
			void getProfile().catch(() => undefined);
		},
		onError: (error: Error) => {
			setLocalError(error.message);
			toast.error(error.message);
		},
	});

	const updateItemMutation = useMutation({
		mutationFn: ({
			itemId,
			data,
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
							),
						}
					: current
			);
			setDrafts((current) => ({
				...current,
				[updatedItem.id]: createDraft(updatedItem),
			}));
			toast.success('Ligne mise à jour');
		},
		onError: (error: Error) => toast.error(error.message),
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
		onSuccess: (validationResult) => {
			setResult(validationResult);
			setStep('done');
			queryClient.invalidateQueries({ queryKey: ['inventory'] });
			queryClient.invalidateQueries({ queryKey: ['budget', 'current'] });
			queryClient.invalidateQueries({ queryKey: ['budget', 'stats'] });
			toast.success('Produits ajoutés');
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		setLocalError(null);

		if (!file) {
			return;
		}

		importMutation.mutate(file);
		event.target.value = '';
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
				[field]: parsedValue,
			};

			if (field === 'quantity' || field === 'unitPrice') {
				nextDraft.totalPrice = getLineTotal(nextDraft);
			}

			return {
				...current,
				[itemId]: nextDraft,
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
						selectedEan: null,
					},
				};
			}

			if (value.startsWith('product:')) {
				return {
					...current,
					[itemId]: {
						...draft,
						productId: value.replace('product:', ''),
						selectedEan: null,
					},
				};
			}

			return {
				...current,
				[itemId]: {
					...draft,
					productId: null,
					selectedEan: value.replace('ean:', ''),
				},
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
					draft.productId === null ? null : draft.productId ?? undefined,
				expiryDate: draft.expiryDate ?? undefined,
				storageLocation:
					draft.storageLocation === null
						? ''
						: draft.storageLocation ?? undefined,
				notes: draft.notes ?? undefined,
				selectedEan:
					draft.selectedEan === null ? null : draft.selectedEan ?? undefined,
			},
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
		<div className='min-h-screen bg-neutral-50'>
			<div className='border-b border-neutral-200 bg-neutral-50'>
				<div className='mx-auto flex max-w-6xl items-center gap-4 px-4 py-4'>
					<Link to='/app/inventory/add'>
						<Button
							variant='ghost'
							size='sm'
							className='size-10 p-0 rounded-xl border border-neutral-200 bg-neutral-50'>
							<ArrowLeft className='size-5 text-neutral-300' />
						</Button>
					</Link>
					<div className='min-w-0 flex-1'>
						<h1 className='text-2xl font-bold text-neutral-300'>
							Facture Drive
						</h1>
						<p className='text-sm text-neutral-200'>
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

			<main className='mx-auto max-w-6xl px-4 py-6'>
				{!canImportDrive && (
					<Card className='border-neutral-200 bg-neutral-50'>
						<CardContent className='flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between'>
							<div>
								<h2 className='text-lg font-semibold text-neutral-300'>
									Import non disponible
								</h2>
								<p className='mt-1 text-sm text-neutral-200'>
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
					<Card className='border-neutral-200 bg-neutral-50'>
						<CardHeader>
							<CardTitle className='flex items-center gap-2 text-neutral-300'>
								<FileText className='size-5' />
								Importer une facture
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							<label className='flex min-h-56 cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-neutral-200 bg-white p-6 text-center transition-colors hover:bg-neutral-100'>
								{importMutation.isPending ? (
									<Loader2 className='size-8 animate-spin text-primary-50' />
								) : (
									<Upload className='size-8 text-primary-50' />
								)}
								<div>
									<p className='text-base font-medium text-neutral-300'>
										{importMutation.isPending
											? 'Analyse en cours...'
											: 'Charger un PDF'}
									</p>
									<p className='mt-1 text-sm text-neutral-200'>
										PDF, 5 Mo max
									</p>
								</div>
								<input
									type='file'
									accept='application/pdf,.pdf'
									onChange={handleFileChange}
									disabled={importMutation.isPending}
									className='sr-only'
								/>
							</label>

							{localError && (
								<Alert variant='error'>
									<AlertDescription>{localError}</AlertDescription>
								</Alert>
							)}
						</CardContent>
					</Card>
				)}

				{canImportDrive && step === 'review' && invoice && (
					<div className='space-y-4'>
						<Card className='border-neutral-200 bg-neutral-50'>
							<CardContent className='grid gap-4 p-4 sm:grid-cols-4'>
								<div>
									<p className='text-xs uppercase text-neutral-200'>Marchand</p>
									<p className='font-medium text-neutral-300'>
										{invoice.merchantName ?? '-'}
									</p>
								</div>
								<div>
									<p className='text-xs uppercase text-neutral-200'>Date</p>
									<p className='font-medium text-neutral-300'>
										{formatDate(invoice.purchaseDate)}
									</p>
								</div>
								<div>
									<p className='text-xs uppercase text-neutral-200'>Total</p>
									<p className='font-medium text-neutral-300'>
										{formatCurrency(invoice.totalAmount)}
									</p>
								</div>
								<div>
									<p className='text-xs uppercase text-neutral-200'>Statut</p>
									<p className='font-medium text-neutral-300'>
										{invoice.status}
									</p>
								</div>
							</CardContent>
						</Card>

						<Card className='border-neutral-200 bg-neutral-50'>
							<CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
								<CardTitle className='text-neutral-300'>
									Lignes détectées
								</CardTitle>
								<Button
									onClick={() => validateMutation.mutate()}
									disabled={
										selectedItems.length === 0 ||
										validateMutation.isPending
									}>
									{validateMutation.isPending ? (
										<Loader2 className='mr-2 size-4 animate-spin' />
									) : (
										<Check className='mr-2 size-4' />
									)}
									Valider {selectedItems.length}
								</Button>
							</CardHeader>
							<CardContent>
								<div className='space-y-3'>
									{invoice.items.map((item) => {
										const draft = drafts[item.id] ?? createDraft(item);
										const isSelected = selectedIds.has(item.id);
										const isExpanded = expandedItemId === item.id;
										const suggestedEans = getSuggestedEans(item);
										const imageUrl = getItemImageUrl(item);

										return (
											<div
												key={item.id}
												className='overflow-hidden rounded-lg border border-neutral-200 bg-white transition-shadow hover:shadow-md'
												data-state={isSelected ? 'selected' : undefined}>
												<div className='flex items-stretch'>
													<label className='flex w-12 shrink-0 cursor-pointer items-center justify-center border-r border-neutral-100'>
														<input
															type='checkbox'
															checked={isSelected}
															disabled={item.validated}
															onChange={() => toggleItem(item.id)}
															className='size-4'
															aria-label={`Sélectionner ${draft.detectedName}`}
														/>
													</label>
													<button
														type='button'
														aria-expanded={isExpanded}
														onClick={() =>
															setExpandedItemId((current) =>
																current === item.id ? null : item.id
															)
														}
														className='flex min-w-0 flex-1 items-center gap-3 p-3 text-left transition-colors hover:bg-neutral-100 sm:gap-4'>
														<div className='flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100'>
															{imageUrl ? (
																<img
																	src={imageUrl}
																	alt={draft.detectedName}
																	className='size-full object-cover'
																/>
															) : (
																<Package className='size-6 text-neutral-200' />
															)}
														</div>
														<div className='min-w-0 flex-1'>
															<p className='truncate font-semibold text-neutral-300'>
																{draft.detectedName || 'Produit sans nom'}
															</p>
															<p className='mt-1 text-xs text-neutral-200'>
																{item.validated
																	? 'Déjà validé'
																	: isSelected
																		? 'Sélectionné'
																		: 'Ignoré à la validation'}
															</p>
														</div>
														<div className='grid shrink-0 grid-cols-2 gap-2 text-right sm:min-w-44'>
															<div>
																<p className='text-xs uppercase text-neutral-200'>
																	Qté
																</p>
																<p className='font-semibold text-neutral-300'>
																	{draft.quantity ?? '-'}
																</p>
															</div>
															<div>
																<p className='text-xs uppercase text-neutral-200'>
																	Prix
																</p>
																<p className='font-semibold text-neutral-300'>
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
													<div className='border-t border-neutral-100 p-4'>
														<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
															<div className='space-y-1.5 md:col-span-2 lg:col-span-1'>
																<label className='text-xs font-medium uppercase text-neutral-200'>
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
															<div className='space-y-1.5'>
																<label className='text-xs font-medium uppercase text-neutral-200'>
																	Quantité
																</label>
																<Input
																	type='number'
																	min='1'
																	step='1'
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
															<div className='space-y-1.5'>
																<label className='text-xs font-medium uppercase text-neutral-200'>
																	Prix unitaire TTC
																</label>
																<Input
																	type='number'
																	min='0'
																	step='0.01'
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
															<div className='space-y-1.5'>
																<label className='text-xs font-medium uppercase text-neutral-200'>
																	Total ligne
																</label>
																<div className='flex h-10 items-center rounded-md border border-neutral-200 bg-neutral-100 px-3 text-sm font-medium text-neutral-300'>
																	{formatCurrency(getLineTotal(draft))}
																</div>
															</div>
															<div className='space-y-1.5'>
																<label className='text-xs font-medium uppercase text-neutral-200'>
																	Association
																</label>
																<Select
																	value={getAssociationValue(draft)}
																	onValueChange={(value) =>
																		updateAssociation(item.id, value)
																	}
																	disabled={item.validated}>
																	<SelectTrigger className='w-full'>
																		<SelectValue />
																	</SelectTrigger>
																	<SelectContent>
																		<SelectItem value='new'>
																			Nouveau produit
																		</SelectItem>
																		{item.product && (
																			<SelectItem
																				value={`product:${item.product.id}`}>
																				{item.product.name}
																			</SelectItem>
																		)}
																		{suggestedEans.map((ean) => (
																			<SelectItem
																				key={ean}
																				value={`ean:${ean}`}>
																				EAN {ean}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
																{item.product ? (
																	<p className='text-xs text-neutral-200'>
																		Produit connu
																		{item.product.barcode
																			? ` · ${item.product.barcode}`
																			: ''}
																	</p>
																) : suggestedEans.length > 0 ? (
																	<p className='text-xs text-warning-50'>
																		{suggestedEans.length} EAN proposé
																		{suggestedEans.length > 1 ? 's' : ''}
																	</p>
																) : (
																	<p className='text-xs text-neutral-200'>
																		Création à la validation
																	</p>
																)}
															</div>
															<div className='space-y-1.5'>
																<label className='text-xs font-medium uppercase text-neutral-200'>
																	Catégorie
																</label>
																<Select
																	value={draft.category ?? undefined}
																	onValueChange={(value) =>
																		updateDraft(item.id, 'category', value)
																	}
																	disabled={
																		item.validated || categoriesLoading
																	}>
																	<SelectTrigger className='w-full'>
																		<SelectValue placeholder='Catégorie' />
																	</SelectTrigger>
																	<SelectContent>
																		{categories.map((category) => (
																			<SelectItem
																				key={category.id}
																				value={category.slug}>
																				{category.name}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															</div>
															<div className='space-y-1.5'>
																<label className='text-xs font-medium uppercase text-neutral-200'>
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
																			value === NO_STORAGE_VALUE
																				? ''
																				: value
																		)
																	}
																	disabled={item.validated}>
																	<SelectTrigger className='w-full'>
																		<SelectValue placeholder='Stockage' />
																	</SelectTrigger>
																	<SelectContent>
																		<SelectItem value={NO_STORAGE_VALUE}>
																			Non renseigné
																		</SelectItem>
																		{STORAGE_LOCATION_OPTIONS.map((location) => (
																			<SelectItem
																				key={location}
																				value={location}>
																				{location}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															</div>
															<div className='space-y-1.5'>
																<label className='text-xs font-medium uppercase text-neutral-200'>
																	Date d'expiration
																</label>
																<Input
																	type='date'
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
															<div className='space-y-1.5 md:col-span-2'>
																<label className='text-xs font-medium uppercase text-neutral-200'>
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
																	placeholder='Optionnel'
																/>
															</div>
														</div>
														<div className='mt-4 flex justify-end'>
															<Button
																type='button'
																variant='outline'
																size='sm'
																disabled={
																	item.validated ||
																	updateItemMutation.isPending
																}
																onClick={() => saveDraft(item)}>
																{updateItemMutation.isPending ? (
																	<Loader2 className='mr-2 size-4 animate-spin' />
																) : (
																	<Save className='mr-2 size-4' />
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

				{step === 'done' && result && (
					<Card className='border-neutral-200 bg-neutral-50'>
						<CardHeader>
							<CardTitle className='flex items-center gap-2 text-neutral-300'>
								<Check className='size-5 text-success-50' />
								Import terminé
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-5'>
							<div className='grid gap-3 sm:grid-cols-4'>
								<SummaryCell
									label='Produits'
									value={String(result.inventoryItemCount)}
								/>
								<SummaryCell
									label='Dépenses'
									value={String(result.expenseCount)}
								/>
								<SummaryCell
									label='Ignorées'
									value={String(result.skippedItemCount)}
								/>
								<SummaryCell
									label='Budget'
									value={formatCurrency(result.totalBudgetAmount)}
								/>
							</div>
							<div className='flex flex-col gap-3 sm:flex-row'>
								<Button onClick={() => navigate({ to: '/app/inventory' })}>
									Retour à l’inventaire
								</Button>
								<Button
									variant='outline'
									onClick={() => {
										setStep('upload');
										setInvoice(null);
										setResult(null);
										setDrafts({});
										setSelectedIds(new Set());
										setExpandedItemId(null);
									}}>
									<X className='mr-2 size-4' />
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
		<div className='rounded-md border border-neutral-200 bg-white p-4'>
			<p className='text-xs uppercase text-neutral-200'>{label}</p>
			<p className='mt-1 text-lg font-semibold text-neutral-300'>{value}</p>
		</div>
	);
}
