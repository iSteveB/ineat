import { ChangeEvent, useMemo, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
	ArrowLeft,
	Check,
	FileText,
	Loader2,
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
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

const normalizeStorageSelectValue = (value?: string | null): string =>
	value && (STORAGE_LOCATION_OPTIONS as readonly string[]).includes(value)
		? value
		: NO_STORAGE_VALUE;

const createDraft = (item: InvoiceItem): InvoiceItemDraft => ({
	detectedName: item.detectedName,
	quantity: item.quantity ?? 1,
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
						: Math.max(1, Math.round(Number(value)))
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
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className='w-10'></TableHead>
											<TableHead>Produit</TableHead>
											<TableHead>Qté</TableHead>
											<TableHead>Prix unitaire TTC</TableHead>
											<TableHead>Association</TableHead>
											<TableHead>Catégorie</TableHead>
											<TableHead>Stockage</TableHead>
											<TableHead className='w-12'></TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{invoice.items.map((item) => {
											const draft = drafts[item.id] ?? createDraft(item);
											const isSelected = selectedIds.has(item.id);
											const suggestedEans = getSuggestedEans(item);

											return (
												<TableRow
													key={item.id}
													data-state={isSelected ? 'selected' : undefined}>
													<TableCell>
														<input
															type='checkbox'
															checked={isSelected}
															disabled={item.validated}
															onChange={() => toggleItem(item.id)}
															className='size-4'
														/>
													</TableCell>
													<TableCell className='min-w-52'>
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
													</TableCell>
													<TableCell className='w-28'>
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
													</TableCell>
													<TableCell className='w-32'>
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
													</TableCell>
													<TableCell className='min-w-52'>
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
															<p className='mt-1 text-xs text-neutral-200'>
																Produit connu
																{item.product.barcode
																	? ` · ${item.product.barcode}`
																	: ''}
															</p>
														) : suggestedEans.length > 0 ? (
															<p className='mt-1 text-xs text-warning-50'>
																{suggestedEans.length} EAN proposé
																{suggestedEans.length > 1 ? 's' : ''}
															</p>
														) : (
															<p className='mt-1 text-xs text-neutral-200'>
																Création à la validation
															</p>
														)}
													</TableCell>
													<TableCell className='min-w-40'>
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
													</TableCell>
													<TableCell className='min-w-40'>
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
																{STORAGE_LOCATION_OPTIONS.map(
																	(location) => (
																		<SelectItem
																			key={location}
																			value={location}>
																			{location}
																		</SelectItem>
																	)
																)}
															</SelectContent>
														</Select>
													</TableCell>
													<TableCell>
														<Button
															type='button'
															variant='ghost'
															size='sm'
															className='size-9 p-0'
															disabled={
																item.validated ||
																updateItemMutation.isPending
															}
															onClick={() => saveDraft(item)}>
															<Save className='size-4' />
														</Button>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
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
