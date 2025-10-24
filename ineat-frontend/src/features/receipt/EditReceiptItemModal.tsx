import React, { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { ReceiptItem } from '@/services/receiptService';

// ===== TYPES =====

/**
 * Données du formulaire d'édition
 */
interface EditFormData {
	detectedName: string;
	quantity: number;
	unitPrice: number | null;
	totalPrice: number | null;
	categoryGuess: string;
	expiryDate: string;
	storageLocation: string;
	notes: string;
}

/**
 * Props du composant EditReceiptItemModal
 */
interface EditReceiptItemModalProps {
	/**
	 * Item à éditer
	 */
	item: ReceiptItem | null;

	/**
	 * Contrôle l'ouverture du modal
	 */
	open: boolean;

	/**
	 * Callback appelé à la fermeture
	 */
	onClose: () => void;

	/**
	 * Callback appelé à la sauvegarde
	 */
	onSave: (itemId: string, data: Partial<EditFormData>) => Promise<void>;
}

// ===== CONSTANTES =====

/**
 * Catégories suggérées
 */
const SUGGESTED_CATEGORIES = [
	'Fruits & Légumes',
	'Viandes & Poissons',
	'Produits laitiers',
	'Épicerie salée',
	'Épicerie sucrée',
	'Boissons',
	'Surgelés',
	'Hygiène & Beauté',
	'Entretien',
	'Autre',
];

// ===== COMPOSANT =====

/**
 * Modal d'édition d'un item de ticket
 * 
 * Fonctionnalités :
 * - Éditer le nom détecté
 * - Modifier la quantité et les prix
 * - Ajouter/modifier la catégorie
 * - Définir date de péremption
 * - Ajouter emplacement de stockage
 * - Ajouter des notes
 * - Validation des champs
 * 
 * @example
 * ```tsx
 * <EditReceiptItemModal
 *   item={selectedItem}
 *   open={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   onSave={async (id, data) => await updateItem(id, data)}
 * />
 * ```
 */
export const EditReceiptItemModal: React.FC<EditReceiptItemModalProps> = ({
	item,
	open,
	onClose,
	onSave,
}) => {
	// ===== STATE =====

	const [formData, setFormData] = useState<EditFormData>({
		detectedName: '',
		quantity: 1,
		unitPrice: null,
		totalPrice: null,
		categoryGuess: '',
		expiryDate: '',
		storageLocation: '',
		notes: '',
	});

	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// ===== EFFETS =====

	/**
	 * Initialise le formulaire avec les données de l'item
	 */
	useEffect(() => {
		if (item) {
			setFormData({
				detectedName: item.detectedName || '',
				quantity: item.quantity || 1,
				unitPrice: item.unitPrice ?? null,
				totalPrice: item.totalPrice ?? null,
				categoryGuess: item.categoryGuess || '',
				expiryDate: item.expiryDate
					? new Date(item.expiryDate).toISOString().split('T')[0]
					: '',
				storageLocation: item.storageLocation || '',
				notes: item.notes || '',
			});
			setError(null);
		}
	}, [item]);

	// ===== HANDLERS =====

	/**
	 * Met à jour un champ du formulaire
	 */
	const handleFieldChange = (
		field: keyof EditFormData,
		value: string | number | null
	) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));

		// Recalculer le prix total si quantité ou prix unitaire change
		if (field === 'quantity' || field === 'unitPrice') {
			const quantity =
				field === 'quantity' ? (value as number) : formData.quantity;
			const unitPrice =
				field === 'unitPrice' ? (value as number | null) : formData.unitPrice;

			if (quantity && unitPrice) {
				setFormData((prev) => ({
					...prev,
					totalPrice: quantity * unitPrice,
				}));
			}
		}

		// Effacer l'erreur lors de la modification
		setError(null);
	};

	/**
	 * Valide le formulaire
	 */
	const validateForm = (): string | null => {
		if (!formData.detectedName.trim()) {
			return 'Le nom du produit est obligatoire';
		}

		if (formData.quantity <= 0) {
			return 'La quantité doit être supérieure à 0';
		}

		if (formData.unitPrice !== null && formData.unitPrice < 0) {
			return 'Le prix unitaire ne peut pas être négatif';
		}

		if (formData.totalPrice !== null && formData.totalPrice < 0) {
			return 'Le prix total ne peut pas être négatif';
		}

		return null;
	};

	/**
	 * Gère la soumission du formulaire
	 */
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!item) return;

		// Valider
		const validationError = validateForm();
		if (validationError) {
			setError(validationError);
			return;
		}

		setIsSaving(true);
		setError(null);

		try {
			// Préparer les données à envoyer (uniquement les champs modifiés)
			const dataToSave: Partial<EditFormData> = {};

			if (formData.detectedName !== item.detectedName) {
				dataToSave.detectedName = formData.detectedName;
			}
			if (formData.quantity !== item.quantity) {
				dataToSave.quantity = formData.quantity;
			}
			if (formData.unitPrice !== item.unitPrice) {
				dataToSave.unitPrice = formData.unitPrice;
			}
			if (formData.totalPrice !== item.totalPrice) {
				dataToSave.totalPrice = formData.totalPrice;
			}
			if (formData.categoryGuess !== (item.categoryGuess || '')) {
				dataToSave.categoryGuess = formData.categoryGuess;
			}
			if (formData.expiryDate !== (item.expiryDate || '')) {
				dataToSave.expiryDate = formData.expiryDate;
			}
			if (formData.storageLocation !== (item.storageLocation || '')) {
				dataToSave.storageLocation = formData.storageLocation;
			}
			if (formData.notes !== (item.notes || '')) {
				dataToSave.notes = formData.notes;
			}

			await onSave(item.id, dataToSave);
			toast.success('Article modifié avec succès');
			onClose();
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
			setError(errorMessage);
			toast.error(errorMessage);
		} finally {
			setIsSaving(false);
		}
	};

	/**
	 * Gère l'annulation
	 */
	const handleCancel = () => {
		if (!isSaving) {
			onClose();
		}
	};

	// ===== RENDU =====

	if (!item) return null;

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Modifier l'article</DialogTitle>
					<DialogDescription>
						Modifiez les informations de l'article détecté
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Erreur globale */}
					{error && (
						<Alert variant="destructive">
							<AlertCircle className="size-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{/* Nom du produit */}
					<div className="space-y-2">
						<Label htmlFor="detectedName">
							Nom du produit <span className="text-destructive">*</span>
						</Label>
						<Input
							id="detectedName"
							value={formData.detectedName}
							onChange={(e) => handleFieldChange('detectedName', e.target.value)}
							placeholder="Ex: Lait demi-écrémé"
							disabled={isSaving}
							required
						/>
					</div>

					{/* Quantité et prix */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="space-y-2">
							<Label htmlFor="quantity">
								Quantité <span className="text-destructive">*</span>
							</Label>
							<Input
								id="quantity"
								type="number"
								min="0.01"
								step="0.01"
								value={formData.quantity}
								onChange={(e) =>
									handleFieldChange('quantity', parseFloat(e.target.value))
								}
								disabled={isSaving}
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="unitPrice">Prix unitaire (€)</Label>
							<Input
								id="unitPrice"
								type="number"
								min="0"
								step="0.01"
								value={formData.unitPrice ?? ''}
								onChange={(e) =>
									handleFieldChange(
										'unitPrice',
										e.target.value ? parseFloat(e.target.value) : null
									)
								}
								placeholder="0.00"
								disabled={isSaving}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="totalPrice">Prix total (€)</Label>
							<Input
								id="totalPrice"
								type="number"
								min="0"
								step="0.01"
								value={formData.totalPrice ?? ''}
								onChange={(e) =>
									handleFieldChange(
										'totalPrice',
										e.target.value ? parseFloat(e.target.value) : null
									)
								}
								placeholder="0.00"
								disabled={isSaving}
							/>
						</div>
					</div>

					{/* Catégorie */}
					<div className="space-y-2">
						<Label htmlFor="categoryGuess">Catégorie</Label>
						<Select
							value={formData.categoryGuess}
							onValueChange={(value) => handleFieldChange('categoryGuess', value)}
							disabled={isSaving}
						>
							<SelectTrigger id="categoryGuess">
								<SelectValue placeholder="Sélectionnez une catégorie" />
							</SelectTrigger>
							<SelectContent>
								{SUGGESTED_CATEGORIES.map((cat) => (
									<SelectItem key={cat} value={cat}>
										{cat}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Date de péremption et emplacement */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="expiryDate">Date de péremption</Label>
							<Input
								id="expiryDate"
								type="date"
								value={formData.expiryDate}
								onChange={(e) => handleFieldChange('expiryDate', e.target.value)}
								disabled={isSaving}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="storageLocation">Emplacement de stockage</Label>
							<Input
								id="storageLocation"
								value={formData.storageLocation}
								onChange={(e) =>
									handleFieldChange('storageLocation', e.target.value)
								}
								placeholder="Ex: Frigo, Placard..."
								disabled={isSaving}
							/>
						</div>
					</div>

					{/* Notes */}
					<div className="space-y-2">
						<Label htmlFor="notes">Notes</Label>
						<Textarea
							id="notes"
							value={formData.notes}
							onChange={(e) => handleFieldChange('notes', e.target.value)}
							placeholder="Ajoutez des notes sur ce produit..."
							rows={3}
							disabled={isSaving}
						/>
					</div>

					{/* Actions */}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={handleCancel}
							disabled={isSaving}
						>
							Annuler
						</Button>
						<Button type="submit" disabled={isSaving}>
							{isSaving ? (
								<>
									<Loader2 className="size-4 mr-2 animate-spin" />
									Enregistrement...
								</>
							) : (
								<>
									<Save className="size-4 mr-2" />
									Enregistrer
								</>
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};

export type { EditReceiptItemModalProps, EditFormData };