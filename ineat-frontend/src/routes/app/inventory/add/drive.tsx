import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import {
	ArrowLeft,
	AlertTriangle,
	Check,
	ChevronDown,
	ChefHat,
	FileText,
	Loader2,
	Minus,
	Package,
	Plus,
	Save,
	Info,
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
import { formatCurrency } from '@/schemas/budget';
import { inventoryService } from '@/services/inventoryService';
import { useAuthStore } from '@/stores/authStore';
import { useInventoryActions } from '@/stores/inventoryStore';
import { STORAGE_LOCATION_OPTIONS } from '@/constants/inventory';
import { HighlightedIngredients } from '@/features/product/IngredientsCard';
import {
	canChooseInvoiceProductCreation,
	getInvoiceTotals,
	getBarcodeFreeProductLabel,
	hasInvoiceItemBarcode,
	getReliableInvoiceItemIds,
	requiresInvoiceItemCorrection,
	sortInvoiceItemsForReview
} from '@/features/invoice/invoiceReview';
import NutriScore from '@/components/common/NutriScore';
import { ExpiryTypeInfo } from "@/components/common/ExpiryTypeInfo";

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

const COOKING_MESSAGES = [
	'On prépare les ingrédients…',
	'Découpage des oignons numériques… sans les larmes.',
	'On goûte les totaux pour vérifier l’assaisonnement…',
	'On cherche les meilleurs accords dans vos produits…',
	'Un dernier coup de torchon avant le service…',
	'On passe chaque ligne de la facture à la loupe…',
	'Les quantités prennent doucement leur place…',
	'On vérifie que les prix sont bien assaisonnés…',
	'Vos produits se rangent dans les bonnes catégories…',
	'La brigade termine les dernières vérifications…'
] as const;

const MINIMUM_COOKING_DURATION_MS = 4_500;
const COOKING_MESSAGE_INTERVAL_MS = 3_000;

const PRODUCT_CREATION_OPTIONS = [
	{ value: 'FRESH', label: 'Produit frais' },
	{ value: 'BULK', label: 'Produit en vrac' },
	{ value: 'PACKAGED', label: 'Créer un nouveau produit' }
] as const;

type InvoiceItemDraft = Pick<
	InvoiceItem,
	| 'detectedName'
	| 'quantity'
	| 'unitPrice'
	| 'totalPrice'
	| 'category'
	| 'productForm'
	| 'productFormConfirmed'
	| 'expiryDate'
	| 'expiryDateSource'
	| 'storageLocation'
	| 'notes'
	| 'selectedEan'
	| 'productId'
>;

const formatOptionalCurrency = (amount?: number | null): string =>
	typeof amount === 'number' ? formatCurrency(amount) : '-';

const formatDate = (date?: string | null): string =>
	date ? new Intl.DateTimeFormat('fr-FR').format(new Date(date)) : '-';

const roundCurrency = (value: number): number => Math.round(value * 100) / 100;

const getLineTotal = (draft: InvoiceItemDraft): number | undefined =>
	typeof draft.totalPrice === 'number'
		? draft.totalPrice
		: typeof draft.quantity === 'number' && typeof draft.unitPrice === 'number'
			? roundCurrency(draft.quantity * draft.unitPrice)
			: undefined;

const getUnitPrice = (draft: InvoiceItemDraft): number | undefined => {
	if (typeof draft.unitPrice === 'number') return draft.unitPrice;
	if (typeof draft.totalPrice !== 'number') return undefined;
	return roundCurrency(draft.totalPrice / normalizeDraftQuantity(draft.quantity));
};

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
	productForm: item.productForm,
	productFormConfirmed: item.productFormConfirmed,
	expiryDate: item.expiryDate,
	expiryDateSource: item.expiryDateSource,
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

/**
 * Badge affiché sur une ligne du ticket. Une ligne reconnue et prête à être ajoutée n'en a pas,
 * pour alléger la liste. Les nouveaux produits gardent leur type (emballé, en vrac, frais).
 */
const getReviewStatus = (
	item: InvoiceItem,
	needsCorrection: boolean
): { label: string; variant: 'secondary' | 'warning' } | null => {
	if (item.validated) {
		return { label: 'Déjà ajouté', variant: 'secondary' };
	}

	if (item.externalProductStatus === 'ERROR') {
		return { label: 'Recherche indisponible, réessayez', variant: 'warning' };
	}

	if (needsCorrection) {
		return { label: 'À vérifier', variant: 'warning' };
	}

	if (!item.productId && !item.product && item.externalProductStatus !== 'FOUND') {
		if (canChooseInvoiceProductCreation(item)) {
			return {
				label:
					item.productForm === 'PACKAGED'
						? 'Nouveau produit'
						: getBarcodeFreeProductLabel(item),
				variant: 'secondary'
			};
		}

		if (!hasInvoiceItemBarcode(item)) {
			return { label: getBarcodeFreeProductLabel(item), variant: 'secondary' };
		}

		return { label: 'À vérifier', variant: 'warning' };
	}

	return null;
};

const NOVA_SHORT_LABELS: Record<string, string> = {
	GROUP_1: 'Non transformé',
	GROUP_2: 'Ingrédient culinaire',
	GROUP_3: 'Transformé',
	GROUP_4: 'Ultra-transformé',
};

const formatNovaShort = (score?: string | null): string => {
	if (!score) return 'Non disponible';
	const group = score.replace('GROUP_', '');
	const label = NOVA_SHORT_LABELS[score];
	return label ? `${group} · ${label}` : score;
};

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
	// Détails gardés montés le temps de l'animation de fermeture.
	const [mountedDetailIds, setMountedDetailIds] = useState<ReadonlySet<string>>(
		() => new Set()
	);
	const [openAssociationIds, setOpenAssociationIds] = useState<Set<string>>(
		() => new Set()
	);
	const [pendingInvoiceFile, setPendingInvoiceFile] = useState<File | null>(
		null
	);
	const [isCookingSequenceComplete, setIsCookingSequenceComplete] =
		useState(true);
	const cookingSequenceTimer = useRef<ReturnType<typeof setTimeout> | null>(
		null
	);
	const autosaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
		{}
	);
	const draftRevisions = useRef<Record<string, number>>({});
	const [saveStates, setSaveStates] = useState<
		Record<string, 'idle' | 'saving' | 'saved' | 'error'>
	>({});

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

		if (!isCookingSequenceComplete) {
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
	}, [invoiceId, invoiceQuery.data, isCookingSequenceComplete]);

	useEffect(
		() => () => {
			if (cookingSequenceTimer.current) {
				clearTimeout(cookingSequenceTimer.current);
			}
		},
		[]
	);

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
	const orderedItems = useMemo(
		() => sortInvoiceItemsForReview(invoice?.items ?? []),
		[invoice?.items]
	);
	const reliableItemIds = useMemo(
		() => getReliableInvoiceItemIds(invoice?.items ?? []),
		[invoice?.items]
	);
	const reviewTotals = useMemo(
		() =>
			getInvoiceTotals(
				(invoice?.items ?? []).map((item) => ({
					...item,
					...(drafts[item.id] ?? {})
				})),
				invoice?.totalAmount
			),
		[invoice?.items, invoice?.totalAmount, drafts]
	);
	const hasUnsavedChanges = Object.values(saveStates).some(
		(state) => state === 'idle' || state === 'saving' || state === 'error'
	);
	const hasBlockingSelectedItems = selectedItems.some((item) => {
		const reviewedItem = { ...item, ...(drafts[item.id] ?? {}) };
		return (
			['ERROR', 'INCOMPLETE'].includes(
				reviewedItem.externalProductStatus ?? ''
			) ||
			(canChooseInvoiceProductCreation(reviewedItem) &&
				!reviewedItem.productFormConfirmed)
		);
	});

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
			toast.success('Facture reçue, l’analyse commence');
			void getProfile().catch(() => undefined);
		},
		onError: (error: Error) => {
			if (cookingSequenceTimer.current) {
				clearTimeout(cookingSequenceTimer.current);
			}
			setIsCookingSequenceComplete(true);
			setStep('upload');
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
			autosave?: boolean;
			revision?: number;
		}) => {
			if (!invoice) {
				throw new Error('Facture introuvable');
			}
			return invoiceService.updateInvoiceItem(invoice.id, itemId, data);
		},
		onSuccess: (updatedItem, variables) => {
			const isLatestRevision =
				variables.revision === undefined ||
				draftRevisions.current[updatedItem.id] === variables.revision;

			if (isLatestRevision) {
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
				setSaveStates((current) => ({
					...current,
					[updatedItem.id]: 'saved'
				}));
			}
			if (!variables.autosave) toast.success('Ligne enregistrée');
		},
		onError: (error: Error, variables) => {
			setSaveStates((current) => ({
				...current,
				[variables.itemId]: 'error'
			}));
			if (!variables.autosave) toast.error(error.message);
		}
	});

	const confirmProductCreationMutation = useMutation({
		mutationFn: ({
			itemId,
			productForm
		}: {
			itemId: string;
			productForm: 'FRESH' | 'BULK' | 'PACKAGED';
		}) => {
			if (!invoice) throw new Error('Facture introuvable');
			return invoiceService.updateInvoiceItem(invoice.id, itemId, {
				productForm
			});
		},
		onMutate: ({ itemId, productForm }) => {
			clearTimeout(autosaveTimers.current[itemId]);
			setSaveStates((current) => ({ ...current, [itemId]: 'saving' }));
			setDrafts((current) => ({
				...current,
				[itemId]: {
					...current[itemId],
					productForm,
					productFormConfirmed: true
				}
			}));
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
			setSaveStates((current) => ({
				...current,
				[updatedItem.id]: 'saved'
			}));
		},
		onError: (error: Error, { itemId }) => {
			const persistedItem = invoice?.items.find((item) => item.id === itemId);
			if (persistedItem) {
				setDrafts((current) => ({
					...current,
					[itemId]: createDraft(persistedItem)
				}));
			}
			setSaveStates((current) => ({ ...current, [itemId]: 'saved' }));
			toast.error('Votre choix n’a pas été enregistré', { description: error.message });
		}
	});

	const retryOpenFoodFactsMutation = useMutation({
		mutationFn: (itemId: string) => {
			if (!invoice) throw new Error('Facture introuvable');
			return invoiceService.retryInvoiceItemOpenFoodFacts(invoice.id, itemId);
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
			if (updatedItem.externalProductStatus === 'ERROR') {
				toast.error('Notre base de produits ne répond pas. Réessayez plus tard.');
			} else {
				toast.success('Recherche terminée');
			}
		},
		onError: (error: Error) => toast.error(error.message)
	});

	const validateMutation = useMutation({
		mutationFn: (invoiceItemIds?: string[]) => {
			if (!invoice) {
				throw new Error('Facture introuvable');
			}
			return invoiceService.validateInvoice(
				invoice.id,
				invoiceItemIds ?? selectedItems.map((item) => item.id)
			);
		},
		onSuccess: async (validationResult, validatedIds) => {
			const remainingCount =
				(invoice?.items.filter((item) => !item.validated).length ?? 0) -
				(validatedIds?.length ?? selectedItems.length);

			if (remainingCount > 0) {
				await invoiceQuery.refetch();
				const addedCount = validatedIds?.length ?? selectedItems.length;
				const plural = addedCount > 1 ? 's' : '';
				toast.success(
					`${addedCount} produit${plural} ajouté${plural}. ${remainingCount} ${remainingCount > 1 ? 'restent' : 'reste'} à vérifier.`
				);
				return;
			}

			setResult(validationResult);
			setStep('done');
			await Promise.all([
				fetchInventoryItems(),
				queryClient.invalidateQueries({ queryKey: ['inventory'] }),
				queryClient.invalidateQueries({ queryKey: ['budget', 'current'] }),
				queryClient.invalidateQueries({ queryKey: ['budget', 'stats'] })
			]);
			toast.success('Produits ajoutés à votre stock');
		},
		onError: (error: Error) => toast.error(error.message)
	});

	useEffect(
		() => () => {
			Object.values(autosaveTimers.current).forEach(clearTimeout);
		},
		[]
	);

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
			toast.success('Nouvelle analyse lancée');
		},
		onError: () => {
			toast.error('Impossible de relancer l’analyse pour le moment. Réessayez dans quelques minutes.');
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

		setStep('processing');
		setIsCookingSequenceComplete(false);
		if (cookingSequenceTimer.current) {
			clearTimeout(cookingSequenceTimer.current);
		}
		cookingSequenceTimer.current = setTimeout(() => {
			setIsCookingSequenceComplete(true);
			cookingSequenceTimer.current = null;
		}, MINIMUM_COOKING_DURATION_MS);
		importMutation.mutate(pendingInvoiceFile);
		setPendingInvoiceFile(null);
	};

	const handleCancelFileAnalysis = () => {
		setPendingInvoiceFile(null);
		setLocalError(null);
	};

	const draftToUpdateInput = (
		draft: InvoiceItemDraft
	): UpdateInvoiceItemInput => ({
		detectedName: draft.detectedName,
		quantity: draft.quantity,
		unitPrice: draft.unitPrice ?? undefined,
		totalPrice: getLineTotal(draft),
		category: draft.category ?? undefined,
		productId: draft.productId === null ? null : (draft.productId ?? undefined),
		expiryDate: draft.expiryDate ?? undefined,
		storageLocation:
			draft.storageLocation === null ? '' : (draft.storageLocation ?? undefined),
		notes: draft.notes ?? undefined,
		selectedEan:
			draft.selectedEan === null ? null : (draft.selectedEan ?? undefined)
	});

	const scheduleDraftAutosave = (itemId: string, draft: InvoiceItemDraft) => {
		clearTimeout(autosaveTimers.current[itemId]);
		const revision = (draftRevisions.current[itemId] ?? 0) + 1;
		draftRevisions.current[itemId] = revision;
		setSaveStates((current) => ({ ...current, [itemId]: 'idle' }));
		autosaveTimers.current[itemId] = setTimeout(() => {
			setSaveStates((current) => ({ ...current, [itemId]: 'saving' }));
			updateItemMutation.mutate({
				itemId,
				data: draftToUpdateInput(draft),
				autosave: true,
				revision
			});
		}, 700);
	};

	const chooseProductCreation = (
		itemId: string,
		productForm: 'FRESH' | 'BULK' | 'PACKAGED'
	) => {
		confirmProductCreationMutation.mutate({ itemId, productForm });
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
				...(field === 'expiryDate' ? { expiryDateSource: 'MANUAL' as const } : {})
			};

			if (field === 'quantity' || field === 'unitPrice') {
				nextDraft.totalPrice =
					typeof nextDraft.quantity === 'number' &&
					typeof nextDraft.unitPrice === 'number'
						? roundCurrency(nextDraft.quantity * nextDraft.unitPrice)
						: undefined;
			}
			scheduleDraftAutosave(itemId, nextDraft);

			return {
				...current,
				[itemId]: nextDraft
			};
		});
	};

	// Sélecteur − / + de la carte : la quantité reste ≥ 1 et le total suit
	// le prix unitaire (déduit du total quand le ticket ne le donne pas).
	const stepQuantity = (itemId: string, delta: 1 | -1) => {
		setDrafts((current) => {
			const currentDraft = current[itemId];
			const quantity = normalizeDraftQuantity(currentDraft.quantity);
			const nextQuantity = Math.max(1, quantity + delta);
			if (nextQuantity === quantity) return current;

			const unitPrice = getUnitPrice(currentDraft);
			const nextDraft = {
				...currentDraft,
				quantity: nextQuantity,
				unitPrice,
				totalPrice:
					typeof unitPrice === 'number'
						? roundCurrency(nextQuantity * unitPrice)
						: undefined
			};
			scheduleDraftAutosave(itemId, nextDraft);

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
				const nextDraft = {
					...draft,
					productId: null,
					selectedEan: null
				};
				scheduleDraftAutosave(itemId, nextDraft);
				return {
					...current,
					[itemId]: nextDraft
				};
			}

			if (value.startsWith('product:')) {
				const nextDraft = {
					...draft,
					productId: value.replace('product:', ''),
					selectedEan: null
				};
				scheduleDraftAutosave(itemId, nextDraft);
				return {
					...current,
					[itemId]: nextDraft
				};
			}

			const nextDraft = {
				...draft,
				productId: null,
				selectedEan: value.replace('ean:', '')
			};
			scheduleDraftAutosave(itemId, nextDraft);
			return {
				...current,
				[itemId]: nextDraft
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
			data: draftToUpdateInput(draft)
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
		<div>
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pt-4 sm:px-6 lg:px-12 lg:pt-6">
				<Button asChild variant="ghost" className="-ml-3 self-start">
					<Link to="/app/inventory/add">
						<ArrowLeft aria-hidden="true" />
						Méthodes d’ajout
					</Link>
				</Button>
				<header className="flex flex-wrap items-end justify-between gap-3">
					<div className="min-w-0">
						<h1 className="type-h1 text-neutral-900">Facture Drive</h1>
						<p className="text-sm text-neutral-600">
							{driveImportsRemaining} import
							{driveImportsRemaining > 1 ? 's' : ''} restant
							{driveImportsRemaining > 1 ? 's' : ''}
						</p>
					</div>
					<Badge variant={canImportDrive ? 'success' : 'default'}>
						{canImportDrive ? 'Premium actif' : 'Indisponible'}
					</Badge>
				</header>
			</div>

			<div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-12 lg:py-6">
				{!canImportDrive && !invoiceId && (
					<Card className="border-neutral-200 bg-surface">
						<CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h2 className="text-lg font-semibold text-neutral-900">
									Import non disponible
								</h2>
								<p className="mt-1 text-sm text-neutral-600">
									{hasDriveAccess
										? 'Vous avez utilisé tous vos imports du mois.'
										: 'L’import de factures Drive est réservé à Premium.'}
								</p>
							</div>
							<Button onClick={() => navigate({ to: '/app/subscription' })}>
								Voir mon abonnement
							</Button>
						</CardContent>
					</Card>
				)}

				{canImportDrive && step === 'upload' && (
					<Card className="border-neutral-200 bg-surface">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-neutral-900">
								<FileText className="size-5" />
								Importer une facture
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{pendingInvoiceFile ? (
								<div className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-lg border border-neutral-200 bg-surface p-6 text-center">
									<FileText className="size-8 text-accent-700" aria-hidden="true" />
									<div className="max-w-full">
										<p className="text-base font-medium text-neutral-900">
											Analyser ce fichier&nbsp;?
										</p>
										<p className="mt-1 max-w-full truncate text-sm text-neutral-600">
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
								<label className="flex min-h-56 cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-neutral-400 bg-surface p-6 text-center transition-colors hover:border-accent-600 hover:bg-accent-50 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
									{importMutation.isPending ? (
										<span className="flex size-14 items-center justify-center rounded-full bg-accent-50 text-accent-700">
											<Loader2 className="size-7 animate-spin" aria-hidden="true" />
										</span>
									) : (
										<span className="flex size-14 items-center justify-center rounded-full bg-accent-50 text-accent-700">
											<Upload className="size-7" aria-hidden="true" />
										</span>
									)}
									<div>
										<p className="text-base font-medium text-neutral-900">
											{importMutation.isPending
												? 'Analyse en cours…'
												: 'Choisir un PDF'}
										</p>
										<p className="mt-1 text-sm text-neutral-600">
											PDF, 5&nbsp;Mo maximum
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
						isUploading={importMutation.isPending && !invoiceId}
					/>
				)}

				{step === 'review' && invoice && (
					<div className="space-y-4">
						<Card className="border-neutral-200 bg-surface">
							<CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5">
								<div>
									<p className="text-xs uppercase text-neutral-600">Marchand</p>
									<p className="font-medium text-neutral-900">
										{invoice.merchantName ?? '-'}
									</p>
								</div>
								<div>
									<p className="text-xs uppercase text-neutral-600">Date</p>
									<p className="font-medium text-neutral-900">
										{formatDate(invoice.purchaseDate)}
									</p>
								</div>
								<div>
									<p className="text-xs uppercase text-neutral-600">Total</p>
									<p className="font-medium text-neutral-900">
										{formatOptionalCurrency(invoice.totalAmount)}
									</p>
								</div>
								<div>
									<p className="text-xs uppercase text-neutral-600">
										Somme des lignes
									</p>
									<p className="font-medium text-neutral-900">
										{formatOptionalCurrency(reviewTotals.linesTotal)}
									</p>
								</div>
								<div>
									<p className="text-xs uppercase text-neutral-600">Écart</p>
									<p
										className={`font-medium ${
											reviewTotals.difference === 0
												? 'text-accent-700'
												: 'text-warning-700'
										}`}
									>
										{formatOptionalCurrency(reviewTotals.difference)}
									</p>
								</div>
							</CardContent>
						</Card>

						<Card className="border-neutral-200 bg-surface">
							<CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
								<div>
									<CardTitle className="text-neutral-900">
										Lignes à vérifier
									</CardTitle>
									<p className="mt-1 text-sm text-neutral-600">
										{(() => {
											const toReviewCount = orderedItems.filter(
												requiresInvoiceItemCorrection
											).length;
											return toReviewCount > 0
												? `${toReviewCount} à vérifier en priorité`
												: 'Tout est prêt à être ajouté.';
										})()}
									</p>
								</div>
								<div className="flex flex-col gap-2 sm:flex-row">
									<Button
										variant="outline"
										onClick={() => validateMutation.mutate(reliableItemIds)}
										disabled={
											reliableItemIds.length === 0 ||
											validateMutation.isPending ||
											hasUnsavedChanges
										}
									>
										Ajouter les {reliableItemIds.length} lignes sûres
									</Button>
									<Button
										onClick={() => validateMutation.mutate(undefined)}
										disabled={
											selectedItems.length === 0 ||
											validateMutation.isPending ||
											hasUnsavedChanges ||
											hasBlockingSelectedItems
										}
									>
										{validateMutation.isPending ? (
											<Loader2 className="mr-2 size-4 animate-spin" />
										) : (
											<Check className="mr-2 size-4" />
										)}
										Ajouter la sélection ({selectedItems.length})
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{orderedItems.map((item) => {
										const draft = drafts[item.id] ?? createDraft(item);
										const isSelected = selectedIds.has(item.id);
										const isExpanded = expandedItemId === item.id;
										const suggestedEans = getSuggestedEans(item);
										const imageUrl = getItemImageUrl(item);
										const reviewedItem = {
											...item,
											productForm: draft.productForm,
											productFormConfirmed: draft.productFormConfirmed
										};
										const needsCorrection =
											requiresInvoiceItemCorrection(reviewedItem);
										const reviewStatus = getReviewStatus(
											reviewedItem,
											needsCorrection
										);
										const canChooseCreation =
											canChooseInvoiceProductCreation(reviewedItem);
										// Un produit reconnu n'a pas besoin du choix de correspondance :
										// il reste accessible via « Ce n'est pas le bon produit ? ».
										const isRecognized =
											Boolean(draft.productId) ||
											(item.externalProductStatus === 'FOUND' &&
												Boolean(draft.selectedEan));
										const showAssociation =
											!isRecognized ||
											needsCorrection ||
											openAssociationIds.has(item.id);
										const saveState = saveStates[item.id] ?? 'idle';
										const quantity = normalizeDraftQuantity(draft.quantity);
										const unitPrice = getUnitPrice(draft);

										return (
											<div
												key={item.id}
												className={`overflow-hidden rounded-lg border bg-surface transition-shadow hover:shadow-md ${
													needsCorrection
														? 'border-warning-500'
														: 'border-neutral-200'
												}`}
												data-state={isSelected ? 'selected' : undefined}
											>
												<div className="transition-colors hover:bg-neutral-50">
													<div className="flex items-center gap-1 pb-1 pl-1 pr-2 pt-2">
														<label className="flex size-11 shrink-0 cursor-pointer items-center justify-center">
															<input
																type="checkbox"
																checked={isSelected}
																disabled={item.validated}
																onChange={() => toggleItem(item.id)}
																className="size-5 accent-accent-600"
																aria-label={`Sélectionner ${draft.detectedName}`}
															/>
														</label>
														<button
															type="button"
															aria-expanded={isExpanded}
															onClick={() => {
																setMountedDetailIds((current) =>
																	new Set(current).add(item.id)
																);
																setExpandedItemId((current) =>
																	current === item.id ? null : item.id
																);
															}}
															className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
														>
															<div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand-50">
																{imageUrl ? (
																	<img
																		src={imageUrl}
																		alt=""
																		className="size-full object-cover"
																	/>
																) : (
																	<Package className="size-6 text-brand-800" />
																)}
															</div>
															<div className="flex min-w-0 flex-1 flex-col gap-1.5">
																<p
																	className={`font-semibold leading-tight text-neutral-900 ${
																		isExpanded ? '' : 'line-clamp-2'
																	}`}
																>
																	{draft.detectedName || 'Produit sans nom'}
																</p>
																{reviewStatus && (
																	<Badge
																		variant={reviewStatus.variant}
																		className="w-fit"
																	>
																		{reviewStatus.variant === 'warning' && (
																			<AlertTriangle className="mr-1 size-3.5" />
																		)}
																		{reviewStatus.label}
																	</Badge>
																)}
															</div>
															<span className="flex size-11 shrink-0 items-center justify-center text-neutral-600">
																<ChevronDown
																	aria-hidden="true"
																	className={`size-5 transition-transform ${
																		isExpanded ? 'rotate-180' : ''
																	}`}
																/>
															</span>
														</button>
													</div>
													<div className="flex items-center gap-2 pb-3 pl-30 pr-4">
														<div
															role="group"
															aria-label={`Quantité de ${draft.detectedName || 'ce produit'}`}
															className="flex items-center gap-1"
														>
															<button
																type="button"
																onClick={() => stepQuantity(item.id, -1)}
																disabled={item.validated || quantity <= 1}
																aria-label="Retirer un"
																className="flex size-10 items-center justify-center rounded-md border border-neutral-200 bg-surface text-neutral-900 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500"
															>
																<Minus aria-hidden="true" className="size-4" />
															</button>
															<output
																aria-live="polite"
																className="w-8 text-center font-semibold text-neutral-900"
															>
																{quantity}
															</output>
															<button
																type="button"
																onClick={() => stepQuantity(item.id, 1)}
																disabled={item.validated}
																aria-label="Ajouter un"
																className="flex size-10 items-center justify-center rounded-md border border-neutral-200 bg-surface text-neutral-900 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500"
															>
																<Plus aria-hidden="true" className="size-4" />
															</button>
														</div>
														<div className="ml-auto text-right">
															<p className="text-lg font-bold text-neutral-900">
																{formatOptionalCurrency(getLineTotal(draft))}
															</p>
															{quantity > 1 && typeof unitPrice === 'number' && (
																<p className="text-sm text-neutral-600">
																	{formatCurrency(unitPrice)} / u
																</p>
															)}
														</div>
													</div>
												</div>

												{canChooseCreation && (
													<div className="border-t border-neutral-100 px-4 py-3">
														<p className="mb-2 text-xs font-medium text-neutral-700">
															Ce produit n’est pas dans notre base. Comment voulez-vous l’ajouter&nbsp;?
														</p>
														<div
															role="radiogroup"
															aria-label="Mode de création du produit"
															className="flex flex-wrap gap-2"
														>
															{PRODUCT_CREATION_OPTIONS.map((option) => {
																const isActive =
																	draft.productFormConfirmed &&
																	draft.productForm === option.value;

																return (
																	<Button
																		key={option.value}
																		type="button"
																		role="radio"
																		aria-checked={isActive}
																		variant={isActive ? 'primary' : 'outline'}
																		onClick={() =>
																			chooseProductCreation(item.id, option.value)
																		}
																		disabled={
																			item.validated ||
																			confirmProductCreationMutation.isPending
																		}
																	>
																		{option.label}
																	</Button>
																);
															})}
														</div>
													</div>
												)}

												{item.externalProductStatus === 'ERROR' &&
													!item.productId &&
													!item.product && (
														<div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-4 py-3">
															<p className="text-xs text-warning-700">
																Notre base de produits n’a pas répondu. On peut retenter la recherche.
															</p>
															<Button
																type="button"
																variant="outline"
																onClick={() => retryOpenFoodFactsMutation.mutate(item.id)}
																disabled={retryOpenFoodFactsMutation.isPending}
															>
																{retryOpenFoodFactsMutation.isPending ? (
																	<Loader2 className="mr-2 size-4 animate-spin" />
																) : (
																	<RotateCcw className="mr-2 size-4" />
																)}
																Réessayer
															</Button>
														</div>
													)}

												{(isExpanded || mountedDetailIds.has(item.id)) && (
													<div
														inert={!isExpanded}
														onTransitionEnd={(event) => {
															if (event.target !== event.currentTarget || isExpanded) return;
															setMountedDetailIds((current) => {
																const next = new Set(current);
																next.delete(item.id);
																return next;
															});
														}}
														className={`grid transition-[grid-template-rows,opacity] duration-200 ease-in-out starting:grid-rows-[0fr] starting:opacity-0 motion-reduce:transition-none ${
															isExpanded
																? 'grid-rows-[1fr] opacity-100'
																: 'grid-rows-[0fr] opacity-0'
														}`}
													>
														<div className="min-h-0 overflow-hidden">
															<div className="border-t border-neutral-100 p-4">
																{item.externalProductData && (
																	<dl className="mb-4 text-base">
																		<div className="flex items-start gap-3 pb-3">
																			<dt className="w-28 shrink-0 pt-0.5 text-sm text-neutral-600">
																				Produit
																			</dt>
																			<dd className="min-w-0 font-medium text-neutral-900">
																				{item.externalProductData.name ??
																					'Nom non disponible'}
																				{item.externalProductData.brand && (
																					<span className="font-normal text-neutral-600">
																						{' · '}
																						{item.externalProductData.brand}
																					</span>
																				)}
																			</dd>
																		</div>
																		<div className="flex items-center gap-3 border-t border-neutral-100 py-3">
																			<dt className="w-28 shrink-0 text-sm text-neutral-600">
																				Nutri-Score
																			</dt>
																			<dd>
																				{item.externalProductData.nutriscore ? (
																					<NutriScore
																						score={item.externalProductData.nutriscore}
																						size="sm"
																					/>
																				) : (
																					<span className="text-neutral-500">
																						Non disponible
																					</span>
																				)}
																			</dd>
																		</div>
																		<div className="flex items-start gap-3 border-t border-neutral-100 py-3">
																			<dt className="w-28 shrink-0 pt-0.5 text-sm text-neutral-600">
																				NOVA
																			</dt>
																			<dd className="min-w-0">
																				{formatNovaShort(item.externalProductData.novascore)}
																			</dd>
																		</div>
																		<div className="flex items-start gap-3 border-t border-neutral-100 py-3">
																			<dt className="w-28 shrink-0 pt-0.5 text-sm text-neutral-600">
																				Eco-Score
																			</dt>
																			<dd
																				className={
																					item.externalProductData.ecoscore
																						? 'font-medium text-neutral-900'
																						: 'text-neutral-500'
																				}
																			>
																				{item.externalProductData.ecoscore ?? 'Non disponible'}
																			</dd>
																		</div>
																		<div className="flex items-start gap-3 border-t border-neutral-100 pt-3">
																			<dt className="w-28 shrink-0 pt-0.5 text-sm text-neutral-600">
																				Ingrédients
																			</dt>
																			<dd className="min-w-0 leading-relaxed text-neutral-900">
																				{item.externalProductData.ingredients ? (
																					<HighlightedIngredients
																						ingredients={
																							item.externalProductData.ingredients
																						}
																					/>
																				) : (
																					<span className="text-neutral-500">
																						Non disponible
																					</span>
																				)}
																			</dd>
																		</div>
																	</dl>
																)}
																<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
																	<div className="space-y-1.5 md:col-span-2 lg:col-span-1">
																		<label className="text-xs font-medium uppercase text-neutral-600">
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
																		<label className="text-xs font-medium uppercase text-neutral-600">
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
																		<label className="text-xs font-medium uppercase text-neutral-600">
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
																	{showAssociation ? (
																		<div className="space-y-1.5">
																			<label className="text-xs font-medium uppercase text-neutral-600">
																				Produit correspondant
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
																							Code-barres {ean}
																						</SelectItem>
																					))}
																				</SelectContent>
																			</Select>
																			{!item.product &&
																				(suggestedEans.length > 0 ? (
																					<p className="text-xs text-warning-700">
																						{suggestedEans.length > 1
																							? `${suggestedEans.length} codes-barres proposés`
																							: '1 code-barres proposé'}
																					</p>
																				) : (
																					<p className="text-xs text-neutral-600">
																						Il sera créé à l’ajout au stock.
																					</p>
																				))}
																			<Input
																				inputMode="numeric"
																				aria-label="Code-barres"
																				placeholder="Code-barres (8 à 13 chiffres)"
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
																	) : (
																		<div className="flex items-end">
																			<button
																				type="button"
																				onClick={() =>
																					setOpenAssociationIds((current) =>
																						new Set(current).add(item.id)
																					)
																				}
																				className="cursor-pointer rounded-sm text-sm font-medium text-accent-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
																			>
																				Ce n’est pas le bon produit&nbsp;?
																			</button>
																		</div>
																	)}
																	<div className="space-y-1.5">
																		<label className="text-xs font-medium uppercase text-neutral-600">
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
																		<label className="text-xs font-medium uppercase text-neutral-600">
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
																				<SelectValue placeholder="Lieu de stockage" />
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
															<label className="flex items-center gap-1 text-xs font-medium uppercase text-neutral-600">
																Date de péremption
																<ExpiryTypeInfo />
																{draft.expiryDateSource === 'ESTIMATED' && draft.expiryDate && (
																	<span title="Date estimée" aria-label="Date estimée">
																		<Info className="size-3.5" aria-hidden="true" />
																	</span>
																)}
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
																		<label className="text-xs font-medium uppercase text-neutral-600">
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
																			placeholder="Facultatif"
																		/>
																	</div>
																</div>
																<div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
																	<p
																		className={`text-xs ${
																			saveState === 'error'
																				? 'text-warning-700'
																				: 'text-neutral-600'
																		}`}
																		role="status"
																	>
																		{saveState === 'saving' && 'Sauvegarde…'}
																		{saveState === 'saved' && 'Modifications enregistrées'}
																		{saveState === 'error' &&
																			'Enregistrement impossible · vos modifications restent sur cet écran'}
																	</p>
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
					<Card className="border-neutral-200 bg-surface">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-neutral-900">
								<Check className="size-5 text-accent-700" />
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
									label="Rattaché au budget"
									value={formatOptionalCurrency(result.totalBudgetAmount)}
								/>
							</div>}
							{result?.requiresBudget && (
								<Alert className="border-warning-200 bg-warning-50">
									<AlertTriangle className="size-4 text-warning-700" />
									<AlertDescription className="space-y-3 text-warning-900">
										<p>
											{result.pendingExpenseCount} dépense{result.pendingExpenseCount > 1 ? 's' : ''}, soit{' '}
											{formatOptionalCurrency(result.pendingBudgetAmount)}, {result.pendingExpenseCount > 1 ? 'sont enregistrées' : 'est enregistrée'} en attente.
											{' '}Créez un budget couvrant la date d’achat pour {result.pendingExpenseCount > 1 ? 'les y rattacher' : 'l’y rattacher'} automatiquement.
										</p>
										<Button asChild size="sm">
											<Link
												to="/app/budget"
												search={invoice?.purchaseDate
													? { month: invoice.purchaseDate.slice(0, 7) }
													: {}}
											>
												Créer mon budget
											</Link>
										</Button>
									</AlertDescription>
								</Alert>
							)}
							<div className="flex flex-col gap-3 sm:flex-row">
								<Button onClick={() => navigate({ to: '/app/inventory' })}>
									Voir mon stock
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
			</div>
		</div>
	);
}

function SummaryCell({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-md border border-neutral-200 bg-surface p-4">
			<p className="text-xs uppercase text-neutral-600">{label}</p>
			<p className="mt-1 text-lg font-semibold text-neutral-900">{value}</p>
		</div>
	);
}

function InvoiceProcessingCard({
	invoice,
	isLoading,
	isFetchError,
	onRefresh,
	onRetry,
	isRetrying,
	isUploading
}: {
	invoice: Invoice | null;
	isLoading: boolean;
	isFetchError: boolean;
	onRefresh: () => void;
	onRetry: () => void;
	isRetrying: boolean;
	isUploading: boolean;
}) {
	const [messageIndex, setMessageIndex] = useState(0);
	const stage = invoice?.processingStage;
	const isFailed = stage === 'FAILED';
	const progress = isUploading ? 5 : (invoice?.processingProgress ?? 0);

	useEffect(() => {
		if (isFailed) {
			return;
		}

		const interval = setInterval(() => {
			setMessageIndex((current) => (current + 1) % COOKING_MESSAGES.length);
		}, COOKING_MESSAGE_INTERVAL_MS);

		return () => clearInterval(interval);
	}, [isFailed]);

	return (
		<Card className="overflow-hidden border-neutral-200 bg-surface">
			<CardContent className="space-y-6 p-6">
				<div
					className="relative flex min-h-64 flex-col items-center justify-center overflow-hidden rounded-2xl border border-neutral-100 bg-surface px-6 py-10 text-center"
					aria-live="polite"
					role="status"
				>
					{!isFailed && (
						<>
							<div className="relative mb-7 flex size-24 items-center justify-center rounded-full bg-accent-100 motion-safe:animate-bounce">
								<span className="absolute inset-0 rounded-full border border-accent-600/40 motion-safe:animate-ping" />
								<ChefHat className="relative size-12 text-accent-700" aria-hidden="true" />
							</div>
							<p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-accent-800">
								Analyse en cours
							</p>
						</>
					)}
					{isFailed && (
						<AlertTriangle className="mb-4 size-10 text-warning-700" />
					)}
					<p className="max-w-xl text-lg font-semibold text-neutral-900">
						{isFailed
							? "Nous n’avons pas réussi à lire cette facture. Relancez l’analyse ou importez un autre PDF."
							: isUploading || (!isFetchError && !isLoading)
								? COOKING_MESSAGES[messageIndex]
								: isFetchError
								? 'L’affichage de la progression est en pause, mais l’analyse continue en arrière-plan.'
								: isLoading
									? 'Récupération de la progression…'
									: COOKING_MESSAGES[messageIndex]}
					</p>
					{!isFailed && (
						<div className="mt-5 flex items-center gap-2" aria-hidden="true">
							{[0, 1, 2].map((dot) => (
								<span
									key={dot}
									className="size-2 rounded-full bg-accent-600 motion-safe:animate-bounce"
									style={{ animationDelay: `${dot * 160}ms` }}
								/>
							))}
						</div>
					)}
				</div>

				{!isFailed && (
					<div className="space-y-2">
						<div className="flex items-center justify-between text-xs text-neutral-600">
							<span>Préparation…</span>
							<span>{progress} %</span>
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
								className="h-full rounded-full bg-canvas transition-[width] duration-700 ease-out"
								style={{ width: `${progress}%` }}
							/>
						</div>
					</div>
				)}

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
						<Link to="/app/inventory">Annuler</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
