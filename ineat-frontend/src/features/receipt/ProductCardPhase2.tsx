import { useEffect, useMemo, useState } from 'react';
import {
	AlertCircle,
	Barcode,
	CheckCircle2,
	Edit3,
	Loader2,
	PackageSearch,
	Search,
	Sprout,
	XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarcodeScanner } from '@/features/scan/BarcodeScanner';
import { receiptService } from '@/services/receiptService';
import type { ProductSearchResult } from '@/services/receiptService';
import type { DetectedProduct, EanSuggestion } from '@/schemas/receipt';
import type { OpenFoodFactsMapping } from '@/schemas/openfoodfact-mapping';
import { cn } from '@/lib/utils';
import { getUserFacingErrorMessage } from '@/utils/errorMessages';

interface ProductCardPhase2Props {
	product: DetectedProduct;
	onUpdate: (updates: Partial<DetectedProduct>) => void;
	onSkip: () => void;
}

type Phase2Mode = 'edit' | 'search' | 'scan';

const isValidEan = (value?: string | null): value is string =>
	typeof value === 'string' && /^\d{13}$/.test(value);

const toNumberOrNull = (value: string): number | null => {
	if (!value.trim()) return null;
	const parsed = Number(value.replace(',', '.'));
	return Number.isFinite(parsed) ? parsed : null;
};

export const ProductCardPhase2 = ({
	product,
	onUpdate,
	onSkip,
}: ProductCardPhase2Props) => {
	const [mode, setMode] = useState<Phase2Mode>('edit');
	const [name, setName] = useState(product.name);
	const [quantity, setQuantity] = useState(String(product.quantity || 1));
	const [unitPrice, setUnitPrice] = useState(
		product.unitPrice?.toString() || ''
	);
	const [totalPrice, setTotalPrice] = useState(
		product.totalPrice?.toString() || ''
	);
	const [searchQuery, setSearchQuery] = useState(product.name);
	const [searchResults, setSearchResults] = useState<ProductSearchResult[]>(
		[]
	);
	const [isSearching, setIsSearching] = useState(false);

	useEffect(() => {
		setName(product.name);
		setQuantity(String(product.quantity || 1));
		setUnitPrice(product.unitPrice?.toString() || '');
		setTotalPrice(product.totalPrice?.toString() || '');
		setSearchQuery(product.name);
	}, [
		product.id,
		product.name,
		product.quantity,
		product.unitPrice,
		product.totalPrice,
	]);

	const statusBadge = useMemo(() => {
		if (product.status === 'validated') {
			return (
				<Badge className='bg-green-500'>
					<CheckCircle2 className='size-3 mr-1' />
					Identifié
				</Badge>
			);
		}
		if (product.status === 'skipped') {
			return (
				<Badge variant='secondary'>
					<XCircle className='size-3 mr-1' />
					Ignoré
				</Badge>
			);
		}

		return (
			<Badge variant='outline'>
				<AlertCircle className='size-3 mr-1' />
				À traiter
			</Badge>
		);
	}, [product.status]);

	const handleSaveEdits = () => {
		const parsedQuantity = toNumberOrNull(quantity);

		if (!name.trim()) {
			toast.error('Le nom du produit est obligatoire');
			return;
		}

		if (!parsedQuantity || parsedQuantity <= 0) {
			toast.error('La quantité doit être supérieure à zéro');
			return;
		}

		onUpdate({
			name: name.trim(),
			quantity: parsedQuantity,
			unitPrice: toNumberOrNull(unitPrice),
			totalPrice: toNumberOrNull(totalPrice),
		});
		toast.success('Produit mis à jour');
	};

	const handleSearch = async () => {
		if (searchQuery.trim().length < 2) {
			toast.error('Saisissez au moins 2 caractères');
			return;
		}

		setIsSearching(true);
		try {
			const results = await receiptService.searchProducts(searchQuery);
			setSearchResults(results);
		} catch (error) {
			toast.error(
				getUserFacingErrorMessage(
					error,
					'Impossible de rechercher ce produit.'
				)
			);
		} finally {
			setIsSearching(false);
		}
	};

	const validateWithSuggestion = (suggestion: EanSuggestion) => {
		onUpdate({
			name: suggestion.productName,
			category: 'packaged',
			requiresBarcode: true,
			status: 'validated',
			selectedEan: suggestion.ean,
			suggestedEans: [suggestion],
			confidence: Math.max(product.confidence, suggestion.confidence),
		});
		setMode('edit');
		toast.success('Produit identifié');
	};

	const handleSelectSearchResult = (result: ProductSearchResult) => {
		const ean = result.ean || result.barcode;

		if (!isValidEan(ean)) {
			toast.error('Ce produit ne possède pas de code EAN exploitable');
			return;
		}

		validateWithSuggestion({
			ean,
			confidence: result.relevanceScore || 0.85,
			brand: result.brand || '-',
			productName: result.name,
			image: result.image || result.imageUrl || null,
		});
	};

	const handleScannedProduct = (foundProduct: OpenFoodFactsMapping) => {
		validateWithSuggestion({
			ean: foundProduct.barcode,
			confidence: Math.max(0.75, foundProduct.quality.completeness),
			brand: foundProduct.brand || '-',
			productName: foundProduct.name,
			image: foundProduct.imageUrl || null,
		});
	};

	const handleCreateFreshProduct = () => {
		if (!name.trim()) {
			toast.error('Le nom du produit est obligatoire');
			return;
		}

		onUpdate({
			name: name.trim(),
			quantity: toNumberOrNull(quantity) || 1,
			unitPrice: toNumberOrNull(unitPrice),
			totalPrice: toNumberOrNull(totalPrice),
			category: 'fresh_produce',
			requiresBarcode: false,
			status: 'validated',
			selectedEan: null,
			suggestedEans: [],
			confidence: Math.max(product.confidence, 0.8),
		});
		toast.success('Produit frais identifié');
	};

	return (
		<Card
			className={cn(
				'transition-all',
				product.status === 'validated' &&
					'border-green-500 bg-green-50/50',
				product.status === 'skipped' && 'opacity-60'
			)}>
			<CardHeader>
				<div className='flex items-start justify-between gap-3'>
					<CardTitle className='flex items-center gap-2 text-lg'>
						<PackageSearch className='size-5 text-primary' />
						{name || product.name}
					</CardTitle>
					{statusBadge}
				</div>
				<p className='text-sm text-muted-foreground'>
					Quantité : {product.quantity || 1}
					{product.totalPrice
						? ` • Total : ${product.totalPrice.toFixed(2)}€`
						: ''}
				</p>
			</CardHeader>

			<CardContent className='space-y-4'>
				<div className='grid gap-3 sm:grid-cols-4'>
					<div className='space-y-1 sm:col-span-2'>
						<Label htmlFor={`${product.id}-name`}>Nom</Label>
						<Input
							id={`${product.id}-name`}
							value={name}
							onChange={(event) => setName(event.target.value)}
						/>
					</div>
					<div className='space-y-1'>
						<Label htmlFor={`${product.id}-quantity`}>Quantité</Label>
						<Input
							id={`${product.id}-quantity`}
							inputMode='decimal'
							value={quantity}
							onChange={(event) => setQuantity(event.target.value)}
						/>
					</div>
					<div className='space-y-1'>
						<Label htmlFor={`${product.id}-total`}>Prix total</Label>
						<Input
							id={`${product.id}-total`}
							inputMode='decimal'
							value={totalPrice}
							onChange={(event) => setTotalPrice(event.target.value)}
							placeholder='0,00'
						/>
					</div>
				</div>

				<div className='flex flex-wrap gap-2'>
					<Button variant='outline' size='sm' onClick={handleSaveEdits}>
						<Edit3 className='size-4 mr-2' />
						Enregistrer
					</Button>
					<Button
						variant={mode === 'search' ? 'primary' : 'outline'}
						size='sm'
						onClick={() =>
							setMode(mode === 'search' ? 'edit' : 'search')
						}>
						<Search className='size-4 mr-2' />
						Rechercher
					</Button>
					<Button
						variant={mode === 'scan' ? 'primary' : 'outline'}
						size='sm'
						onClick={() =>
							setMode(mode === 'scan' ? 'edit' : 'scan')
						}>
						<Barcode className='size-4 mr-2' />
						Scanner
					</Button>
					<Button
						variant='outline'
						size='sm'
						onClick={handleCreateFreshProduct}>
						<Sprout className='size-4 mr-2' />
						Produit frais
					</Button>
					<Button variant='ghost' size='sm' onClick={onSkip}>
						<XCircle className='size-4 mr-2' />
						Ignorer
					</Button>
				</div>

				{mode === 'search' && (
					<div className='space-y-3 rounded-lg border p-3'>
						<div className='flex gap-2'>
							<Input
								value={searchQuery}
								onChange={(event) =>
									setSearchQuery(event.target.value)
								}
								placeholder='Nom, marque ou libellé produit'
							/>
							<Button onClick={handleSearch} disabled={isSearching}>
								{isSearching ? (
									<Loader2 className='size-4 animate-spin' />
								) : (
									<Search className='size-4' />
								)}
							</Button>
						</div>
						<div className='space-y-2'>
							{searchResults.map((result) => (
								<button
									key={result.id}
									type='button'
									onClick={() =>
										handleSelectSearchResult(result)
									}
									className='w-full rounded-lg border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5'>
									<p className='font-medium'>{result.name}</p>
									<p className='text-sm text-muted-foreground'>
										{result.brand || 'Marque inconnue'}
										{result.barcode || result.ean
											? ` • ${result.barcode || result.ean}`
											: ''}
									</p>
								</button>
							))}
							{!isSearching && searchResults.length === 0 && (
								<p className='text-sm text-muted-foreground'>
									Lancez une recherche pour associer un
									produit existant.
								</p>
							)}
						</div>
					</div>
				)}

				{mode === 'scan' && (
					<div className='space-y-3 rounded-lg border p-3'>
						<BarcodeScanner
							onProductFound={handleScannedProduct}
							onProductNotFound={(barcode) =>
								toast.error(`Aucun produit trouvé pour ${barcode}`)
							}
							onError={(message) => toast.error(message)}
							onClose={() => setMode('edit')}
						/>
					</div>
				)}

				{product.status === 'validated' && (
					<Alert className='border-green-200 bg-green-50'>
						<CheckCircle2 className='size-4 text-green-600' />
						<AlertDescription>
							Ce produit est identifié et pourra être ajouté à l'inventaire.
						</AlertDescription>
					</Alert>
				)}
			</CardContent>
		</Card>
	);
};
