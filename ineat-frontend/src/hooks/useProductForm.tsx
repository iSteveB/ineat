import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { z } from 'zod';
import {
	AddInventoryItemSchema,
	type AddInventoryItemData,
	type UnitType,
	type Category,
} from '@/schemas';

// Type de formulaire basé sur le schéma Zod mais avec des chaînes pour l'interface
export type FormData = {
	// Champs obligatoires
	name: string;
	category: string;
	quantity: string;
	unitType: UnitType;
	purchaseDate: string;

	// Champs optionnels
	brand: string;
	barcode: string;
	expiryDate: string;
	purchasePrice: string;
	storageLocation: string;
	notes: string;

	// Scores
	nutriscore: string;
	ecoscore: string;
	novascore: string;

	// Nutriments (en string pour les inputs)
	energy: string;
	proteins: string;
	carbohydrates: string;
	fats: string;
	sugars: string;
	fiber: string;
	salt: string;
	saturatedFats: string;

	// Contenu
	ingredients: string;
	imageUrl: string;
};

interface UseProductFormOptions {
	categories: Category[];
	onSubmit: (data: AddInventoryItemData) => Promise<void>;
	defaultProductName?: string;
	defaultBrand?: string;
	defaultBarcode?: string;
}

interface UseProductFormReturn {
	// État du formulaire
	formData: FormData;
	errors: Record<string, string>;

	// États dérivés
	hasPrefilledData: boolean;

	// Gestionnaires
	handleInputChange: (field: keyof FormData, value: string) => void;
	handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
	validateForm: () => boolean;

	// Utilitaires
	resetForm: () => void;
}

export const useProductForm = (
	options: UseProductFormOptions
): UseProductFormReturn => {
	const {
		categories,
		onSubmit,
		defaultProductName = '',
		defaultBrand = '',
		defaultBarcode = '',
	} = options;

	// État initial du formulaire
	const getInitialFormData = useCallback(
		(): FormData => ({
			// Champs obligatoires
			name: defaultProductName || '',
			brand: defaultBrand || '',
			barcode: defaultBarcode || '',
			category: '',
			quantity: '1',
			unitType: 'UNIT',
			purchaseDate: format(new Date(), 'yyyy-MM-dd'),

			// Champs optionnels
			expiryDate: '',
			purchasePrice: '',
			storageLocation: '',
			notes: '',

			// Scores
			nutriscore: '',
			ecoscore: '',
			novascore: '',

			// Nutriments
			energy: '',
			proteins: '',
			carbohydrates: '',
			fats: '',
			sugars: '',
			fiber: '',
			salt: '',
			saturatedFats: '',

			// Contenu
			ingredients: '',
			imageUrl: '',
		}),
		[defaultProductName, defaultBrand, defaultBarcode]
	);

	const [formData, setFormData] = useState<FormData>(getInitialFormData());
	const [errors, setErrors] = useState<Record<string, string>>({});

	// États dérivés
	const hasPrefilledData = Boolean(
		defaultProductName || defaultBrand || defaultBarcode
	);

	// Fonction de transformation des données du formulaire vers le schéma Zod
	const transformFormDataToSchema = useCallback(
		(formData: FormData): Partial<AddInventoryItemData> => {
			// Construire l'objet nutrients seulement s'il y a des valeurs
			const nutrients: Record<string, number> = {};
			if (formData.energy && !isNaN(Number(formData.energy)))
				nutrients.energy = Number(formData.energy);
			if (formData.proteins && !isNaN(Number(formData.proteins)))
				nutrients.proteins = Number(formData.proteins);
			if (
				formData.carbohydrates &&
				!isNaN(Number(formData.carbohydrates))
			)
				nutrients.carbohydrates = Number(formData.carbohydrates);
			if (formData.fats && !isNaN(Number(formData.fats)))
				nutrients.fats = Number(formData.fats);
			if (formData.sugars && !isNaN(Number(formData.sugars)))
				nutrients.sugars = Number(formData.sugars);
			if (formData.fiber && !isNaN(Number(formData.fiber)))
				nutrients.fiber = Number(formData.fiber);
			if (formData.salt && !isNaN(Number(formData.salt)))
				nutrients.salt = Number(formData.salt);
			if (
				formData.saturatedFats &&
				!isNaN(Number(formData.saturatedFats))
			)
				nutrients.saturatedFats = Number(formData.saturatedFats);

			return {
				// Champs obligatoires
				name: formData.name.trim(),
				category: formData.category,
				quantity: Number(formData.quantity),
				unitType: formData.unitType,
				purchaseDate: formData.purchaseDate,

				// Champs optionnels avec transformation
				...(formData.brand.trim() && { brand: formData.brand.trim() }),
				...(formData.barcode.trim() && {
					barcode: formData.barcode.trim(),
				}),
				...(formData.expiryDate && { expiryDate: formData.expiryDate }),
				...(formData.purchasePrice &&
					!isNaN(Number(formData.purchasePrice)) && {
						purchasePrice: Number(formData.purchasePrice),
					}),
				...(formData.storageLocation.trim() && {
					storageLocation: formData.storageLocation.trim(),
				}),
				...(formData.notes.trim() && { notes: formData.notes.trim() }),

				// Scores
				...(formData.nutriscore &&
					['A', 'B', 'C', 'D', 'E'].includes(formData.nutriscore) && {
						nutriscore: formData.nutriscore as
							| 'A'
							| 'B'
							| 'C'
							| 'D'
							| 'E',
					}),
				...(formData.ecoscore &&
					['A', 'B', 'C', 'D', 'E'].includes(formData.ecoscore) && {
						ecoscore: formData.ecoscore as
							| 'A'
							| 'B'
							| 'C'
							| 'D'
							| 'E',
					}),
				...(formData.novascore &&
					['1', '2', '3', '4'].includes(formData.novascore) && {
						novascore: `GROUP_${formData.novascore}` as
							| 'GROUP_1'
							| 'GROUP_2'
							| 'GROUP_3'
							| 'GROUP_4',
					}),

				// Nutrition et contenu
				...(Object.keys(nutrients).length > 0 && { nutrients }),
				...(formData.imageUrl.trim() && {
					imageUrl: formData.imageUrl.trim(),
				}),
				...(formData.ingredients.trim() && {
					ingredients: formData.ingredients.trim(),
				}),
			};
		},
		[]
	);

	// Validation avec Zod
	const validateWithZod = useCallback(
		(data: Partial<AddInventoryItemData>): boolean => {
			try {
				AddInventoryItemSchema.parse(data);
				setErrors({});
				return true;
			} catch (error) {
				if (error instanceof z.ZodError) {
					const zodErrors: Record<string, string> = {};
					error.errors.forEach((err) => {
						const field = err.path.join('.');
						zodErrors[field] = err.message;
					});
					setErrors(zodErrors);
					return false;
				}
				return false;
			}
		},
		[]
	);

	// Validation du formulaire
	const validateForm = useCallback((): boolean => {
		const transformedData = transformFormDataToSchema(formData);
		return validateWithZod(transformedData);
	}, [formData, transformFormDataToSchema, validateWithZod]);

	// Gestionnaire de changement des champs
	const handleInputChange = useCallback(
		(field: keyof FormData, value: string) => {
			setFormData((prev) => ({ ...prev, [field]: value }));

			// Nettoyer l'erreur de ce champ
			if (errors[field]) {
				setErrors((prev) => {
					const newErrors = { ...prev };
					delete newErrors[field];
					return newErrors;
				});
			}
		},
		[errors]
	);

	// Soumission du formulaire avec validation Zod
	const handleSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();

			// Transformer et valider avec Zod
			const transformedData = transformFormDataToSchema(formData);

			if (!validateForm()) {
				toast.error('Veuillez corriger les erreurs du formulaire');
				return;
			}

			// Vérification supplémentaire de la catégorie
			const selectedCategory = categories.find(
				(cat) => cat.slug === formData.category
			);
			if (!selectedCategory) {
				toast.error("La catégorie sélectionnée n'est pas valide");
				return;
			}

			console.log('Données validées avec Zod:', transformedData);

			try {
				await onSubmit(transformedData as AddInventoryItemData);
			} catch (error: unknown) {
				console.error('Erreur lors de la soumission:', error);
			}
		},
		[
			formData,
			transformFormDataToSchema,
			validateForm,
			categories,
			onSubmit,
		]
	);

	// Réinitialisation du formulaire
	const resetForm = useCallback(() => {
		setFormData(getInitialFormData());
		setErrors({});
	}, [getInitialFormData]);

	// Mise à jour des valeurs par défaut quand les props changent
	useEffect(() => {
		setFormData((prev) => {
			const shouldUpdate =
				defaultProductName !== undefined ||
				defaultBrand !== undefined ||
				defaultBarcode !== undefined;
			if (!shouldUpdate) return prev;

			return {
				...prev,
				name: defaultProductName || prev.name,
				brand: defaultBrand || prev.brand,
				barcode: defaultBarcode || prev.barcode,
			};
		});
	}, [defaultProductName, defaultBrand, defaultBarcode]);

	return {
		// État du formulaire
		formData,
		errors,

		// États dérivés
		hasPrefilledData,

		// Gestionnaires
		handleInputChange,
		handleSubmit,
		validateForm,

		// Utilitaires
		resetForm,
	};
};
