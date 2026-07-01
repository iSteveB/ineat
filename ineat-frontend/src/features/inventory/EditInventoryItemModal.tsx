import React, { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Loader2, Package, Calendar, MapPin, FileText } from 'lucide-react';
import { InventoryItemWithStatus, UpdateInventoryItemData } from '@/schemas';
import { getExpirySuggestion } from '@/utils/expiryEstimation';
import {
	getProductStateOptions,
	PackageStatus,
	PreparationStatus,
} from '@/utils/productStateOptions';
import { ProductStateSection } from './form/section/ProductStateSection';

interface EditInventoryItemModalProps {
	item: InventoryItemWithStatus | null;
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (updates: UpdateInventoryItemData) => Promise<void>;
	isSubmitting?: boolean;
}

// Lieux de stockage prédéfinis
const STORAGE_LOCATIONS = [
	{ value: 'refrigerateur', label: 'Réfrigérateur' },
	{ value: 'congelateur', label: 'Congélateur' },
	{ value: 'placard', label: 'Placard' },
	{ value: 'cellier', label: 'Cellier' },
	{ value: 'cave', label: 'Cave' },
	{ value: 'autre', label: 'Autre' },
];

const normalize = (value?: string | null): string =>
	(value ?? '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/_/g, '-')
		.trim();

const resolveStorageLocationValue = (storageLocation?: string | null): string => {
	const normalized = normalize(storageLocation);

	return (
		STORAGE_LOCATIONS.find(
			(location) =>
				normalize(location.value) === normalized ||
				normalize(location.label) === normalized,
		)?.value ??
		storageLocation ??
		''
	);
};

// Fonction pour formater une date au format yyyy-MM-dd
const formatDate = (dateString: string | undefined): string => {
	if (!dateString) return '';
	const date = new Date(dateString);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

/**
 * Modal pour modifier les informations d'un produit de l'inventaire
 */
export const EditInventoryItemModal: React.FC<EditInventoryItemModalProps> = ({
	item,
	isOpen,
	onClose,
	onSubmit,
	isSubmitting = false,
}) => {
	// États du formulaire
	const [quantity, setQuantity] = useState<number>(1);
	const [storageLocation, setStorageLocation] = useState<string>('');
	const [expiryDate, setExpiryDate] = useState<string>('');
	const [expiryDateSource, setExpiryDateSource] = useState<
		'MANUAL' | 'ESTIMATED'
	>('MANUAL');
	const [purchaseDate, setPurchaseDate] = useState<string>('');
	const [packageStatus, setPackageStatus] = useState<PackageStatus | ''>('');
	const [preparationStatus, setPreparationStatus] = useState<
		PreparationStatus | ''
	>('');
	const [notes, setNotes] = useState<string>('');

	// Initialiser les valeurs du formulaire quand l'item change
	useEffect(() => {
		if (item) {
			setQuantity(item.quantity);
			setStorageLocation(resolveStorageLocationValue(item.storageLocation));
			setExpiryDate(formatDate(item.expiryDate));
			setExpiryDateSource(
				item.expiryDate ? item.expiryDateSource || 'MANUAL' : 'ESTIMATED',
			);
			setPurchaseDate(formatDate(item.purchaseDate));
			setPackageStatus(item.packageStatus || '');
			setPreparationStatus(item.preparationStatus || '');
			setNotes(item.notes || '');
		}
	}, [item]);

	// Réinitialiser le formulaire à la fermeture
	useEffect(() => {
		if (!isOpen && item) {
			setQuantity(item.quantity);
			setStorageLocation(resolveStorageLocationValue(item.storageLocation));
			setExpiryDate(formatDate(item.expiryDate));
			setExpiryDateSource(
				item.expiryDate ? item.expiryDateSource || 'MANUAL' : 'ESTIMATED',
			);
			setPurchaseDate(formatDate(item.purchaseDate));
			setPackageStatus(item.packageStatus || '');
			setPreparationStatus(item.preparationStatus || '');
			setNotes(item.notes || '');
		}
	}, [isOpen, item]);

	const expirySuggestion = item
		? getExpirySuggestion({
				productName: item.product.name,
				categorySlug: item.product.category?.slug,
				categoryName: item.product.category?.name,
				storageLocation,
				packageStatus: packageStatus || undefined,
				preparationStatus: preparationStatus || undefined,
				purchaseDate,
			})
		: null;

	useEffect(() => {
		if (!expirySuggestion) return;
		if (expiryDateSource === 'MANUAL') return;
		if (expiryDate === expirySuggestion.date) return;

		setExpiryDate(expirySuggestion.date);
		setExpiryDateSource('ESTIMATED');
	}, [expiryDate, expiryDateSource, expirySuggestion]);

	useEffect(() => {
		if (!item) return;

		const options = getProductStateOptions({
			productName: item.product.name,
			categorySlug: item.product.category?.slug,
			categoryName: item.product.category?.name,
			storageLocation,
		});

		const nextPackageStatus = options.showPackageStatus
			? packageStatus || options.defaultPackageStatus || ''
			: '';
		const nextPreparationStatus = options.showPreparationStatus
			? preparationStatus || options.defaultPreparationStatus || ''
			: '';

		if (nextPackageStatus !== packageStatus) {
			setPackageStatus(nextPackageStatus);
		}
		if (nextPreparationStatus !== preparationStatus) {
			setPreparationStatus(nextPreparationStatus);
		}
	}, [item, packageStatus, preparationStatus, storageLocation]);

	const handleExpiryDateChange = (value: string): void => {
		setExpiryDate(value);
		setExpiryDateSource(value ? 'MANUAL' : 'ESTIMATED');
	};

	const handleProductStateChange = (
		field: 'packageStatus' | 'preparationStatus',
		value: string,
	): void => {
		if (field === 'packageStatus') {
			setPackageStatus(value as PackageStatus);
		} else {
			setPreparationStatus(value as PreparationStatus);
		}
	};

	// Gérer la soumission du formulaire
	const handleSubmit = async (e: React.FormEvent): Promise<void> => {
		e.preventDefault();

		if (!item) return;

		// Préparer les données de mise à jour
		const updates: UpdateInventoryItemData = {
			quantity,
			storageLocation: storageLocation || undefined,
			purchaseDate: purchaseDate || undefined,
			...(expiryDateSource === 'MANUAL' && {
				expiryDate: expiryDate || undefined,
			}),
			packageStatus: packageStatus || undefined,
			preparationStatus: preparationStatus || undefined,
			notes: notes || undefined,
		};

		await onSubmit(updates);
	};

	if (!item) return null;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className='max-w-md'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<Package className='size-5 text-success-50' />
						Modifier le produit
					</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className='space-y-4'>
					{/* Nom du produit (lecture seule) */}
					<div>
						<Label className='text-sm font-medium text-neutral-700'>
							Produit
						</Label>
						<p className='mt-1 text-sm text-neutral-900 font-medium'>
							{item.product.name}
							{item.product.brand && (
								<span className='text-neutral-600 ml-2'>
									({item.product.brand})
								</span>
							)}
						</p>
					</div>

					{/* Quantité */}
					<div>
						<Label htmlFor='quantity' className='flex items-center gap-2'>
							<Package className='size-4' />
							Quantité
						</Label>
						<Input
							id='quantity'
							type='number'
							min='0'
							step='1'
							value={quantity}
							onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
							placeholder='Quantité'
							required
							className='mt-1'
						/>
						<p className='text-xs text-neutral-600 mt-1'>
							Unité :{' '}
							{item.product.unitType === 'UNIT'
								? 'Unité(s)'
								: item.product.unitType}
						</p>
					</div>

					{/* Lieu de stockage */}
					<div>
						<Label
							htmlFor='storageLocation'
							className='flex items-center gap-2'
						>
							<MapPin className='size-4' />
							Lieu de stockage
						</Label>
						<Select value={storageLocation} onValueChange={setStorageLocation}>
							<SelectTrigger id='storageLocation' className='mt-1'>
								<SelectValue placeholder='Sélectionner un lieu' />
							</SelectTrigger>
							<SelectContent className='bg-neutral-100'>
								{STORAGE_LOCATIONS.map((location) => (
									<SelectItem key={location.value} value={location.value}>
										{location.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Date de péremption */}
					<div>
						<Label htmlFor='expiryDate' className='flex items-center gap-2'>
							<Calendar className='size-4' />
							Date de péremption
						</Label>
						<Input
							id='expiryDate'
							type='date'
							value={expiryDate}
							onChange={(e) => handleExpiryDateChange(e.target.value)}
							className='mt-1'
						/>
						{expiryDateSource === 'MANUAL' && expiryDate && (
							<p className='text-xs text-neutral-600 mt-1'>
								Date manuelle conservée. Les changements de contexte ne
								l’écraseront pas.
							</p>
						)}
					</div>

					{/* Date d'achat */}
					<div>
						<Label htmlFor='purchaseDate' className='flex items-center gap-2'>
							<Calendar className='size-4' />
							Date d'achat
						</Label>
						<Input
							id='purchaseDate'
							type='date'
							value={purchaseDate}
							onChange={(e) => setPurchaseDate(e.target.value)}
							className='mt-1'
						/>
					</div>

					<ProductStateSection
						values={{ packageStatus, preparationStatus }}
						productName={item.product.name}
						categorySlug={item.product.category?.slug}
						categoryName={item.product.category?.name}
						storageLocation={storageLocation}
						onChange={handleProductStateChange}
						disabled={isSubmitting}
					/>

					{/* Notes */}
					<div>
						<Label htmlFor='notes' className='flex items-center gap-2'>
							<FileText className='size-4' />
							Notes
						</Label>
						<Textarea
							id='notes'
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder='Ajoutez des notes (optionnel)'
							rows={3}
							className='mt-1 resize-none'
						/>
					</div>

					{/* Boutons d'action */}
					<DialogFooter className='gap-2'>
						<Button
							type='button'
							variant='outline'
							onClick={onClose}
							disabled={isSubmitting}
						>
							Annuler
						</Button>
						<Button
							type='submit'
							disabled={isSubmitting}
							className='bg-success-50 hover:bg-success-50/80'
						>
							{isSubmitting ? (
								<>
									<Loader2 className='size-4 mr-2 animate-spin' />
									Modification...
								</>
							) : (
								'Enregistrer'
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};
