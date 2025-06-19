import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  ArrowLeft, 
  Calendar,
  Package,
  Euro,
  Save,
  PackageOpen,
  Leaf,
  Activity,
  Loader2
} from 'lucide-react';
import { 
  AddManualProductSchema, 
  AddManualProductInput,
  UnitType,
  NutriScore,
  EcoScore 
} from '@/schemas/inventorySchema';
import { useAddManualProduct } from '@/hooks/useInventory';
import { 
  useInventoryFormState, 
  useInventoryActions, 
  useInventoryRecentValues,
  useSaveRecentValues,
} from '@/stores/inventory-store';

const CATEGORIES = [
  { value: '', label: 'Sélectionner une catégorie' },
  { value: 'fruits-et-legumes', label: 'Fruits & Légumes' },
  { value: 'viandes-poissons', label: 'Viandes & Poissons' },
  { value: 'produits-laitiers', label: 'Produits laitiers' },
  { value: 'epicerie-salee', label: 'Épicerie salée' },
  { value: 'epicerie-sucree', label: 'Épicerie sucrée' },
  { value: 'surgeles', label: 'Surgelés' },
  { value: 'boissons', label: 'Boissons' },
  { value: 'autres', label: 'Autres' },
];

const UNIT_TYPES = [
  { value: 'UNIT' as UnitType, label: 'Unité(s)' },
  { value: 'KG' as UnitType, label: 'Kilogramme(s)' },
  { value: 'G' as UnitType, label: 'Gramme(s)' },
  { value: 'L' as UnitType, label: 'Litre(s)' },
  { value: 'ML' as UnitType, label: 'Millilitre(s)' },
];

const STORAGE_LOCATIONS = [
  { value: '', label: 'Sélectionner un lieu' },
  { value: 'refrigerateur', label: 'Réfrigérateur' },
  { value: 'congelateur', label: 'Congélateur' },
  { value: 'placard', label: 'Placard' },
  { value: 'cave', label: 'Cave' },
  { value: 'autres', label: 'Autres' },
];

const NUTRISCORE_OPTIONS = [
  { value: '', label: 'Non défini' },
  { value: 'A' as NutriScore, label: 'A - Très bonne qualité nutritionnelle' },
  { value: 'B' as NutriScore, label: 'B - Bonne qualité nutritionnelle' },
  { value: 'C' as NutriScore, label: 'C - Qualité nutritionnelle correcte' },
  { value: 'D' as NutriScore, label: 'D - Qualité nutritionnelle faible' },
  { value: 'E' as NutriScore, label: 'E - Qualité nutritionnelle très faible' },
];

const ECOSCORE_OPTIONS = [
  { value: '', label: 'Non défini' },
  { value: 'A' as EcoScore, label: 'A - Très faible impact environnemental' },
  { value: 'B' as EcoScore, label: 'B - Faible impact environnemental' },
  { value: 'C' as EcoScore, label: 'C - Impact environnemental modéré' },
  { value: 'D' as EcoScore, label: 'D - Impact environnemental élevé' },
  { value: 'E' as EcoScore, label: 'E - Impact environnemental très élevé' },
];

export function AddManualProductPage() {
  const navigate = useNavigate();
  
  // Hooks pour l'état et les actions
  const draftProduct = useInventoryFormState();
  const { clearDraftProduct } = useInventoryActions();
  const recentValues = useInventoryRecentValues();
  const saveRecentValues = useSaveRecentValues();
  
  // Hook pour la mutation d'ajout de produit
  const addProductMutation = useAddManualProduct();
  
  // Configuration du formulaire avec React Hook Form et Zod
  const form = useForm<AddManualProductInput>({
    resolver: zodResolver(AddManualProductSchema),
    defaultValues: {
      name: draftProduct.name || '',
      brand: draftProduct.brand || '',
      category: draftProduct.category || '',
      quantity: draftProduct.quantity || 1,
      unitType: draftProduct.unitType || 'UNIT',
      purchaseDate: draftProduct.purchaseDate || new Date().toISOString().split('T')[0],
      expiryDate: draftProduct.expiryDate || '',
      purchasePrice: draftProduct.purchasePrice,
      storageLocation: draftProduct.storageLocation || '',
      notes: draftProduct.notes || '',
      nutriscore: draftProduct.nutriscore,
      ecoscore: draftProduct.ecoscore,
      nutritionalInfo: draftProduct.nutritionalInfo || {
        carbohydrates: undefined,
        proteins: undefined,
        fats: undefined,
        salt: undefined,
      },
    },
  });

  const { handleSubmit, formState: { errors, isValid } } = form;
  
  // Soumission du formulaire
  const onSubmit = async (data: AddManualProductInput) => {
    try {
      const result = await addProductMutation.mutateAsync(data);
      console.log('Produit ajouté avec succès:', result);
      
      // Sauvegarder les valeurs récentes pour faciliter la prochaine saisie
      saveRecentValues(data);
      
      // Nettoyer le formulaire
      clearDraftProduct();
      
      // Redirection vers l'inventaire
      navigate({ to: '/app/inventory' });
      
    } catch (error) {
      // L'erreur est déjà gérée par le hook useAddManualProduct
      console.error('Erreur lors de l\'ajout du produit:', error);
    }
  };

  // Gestion de l'annulation
  const handleCancel = () => {
    clearDraftProduct();
    navigate({ to: '/app/inventory/add-product' });
  };

  // État de chargement
  const isLoading = addProductMutation.isPending;

  return (
    <div className="min-h-screen bg-primary-50">
      {/* Header */}
      <div className="bg-neutral-50 border-b border-t border-neutral-200 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={handleCancel}
            className="p-2 -ml-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            disabled={isLoading}
          >
            <ArrowLeft className="size-6" />
          </button>
          <h1 className="text-lg font-semibold text-neutral-900">
            Ajouter manuellement un produit
          </h1>
          <div className="size-9" />
        </div>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-6">
        {/* Informations de base */}
        <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4">
          <h2 className="text-xl font-medium text-neutral-900 mb-4 flex items-center gap-2">
            <Package className="size-5 text-success-50" />
            Informations du produit
          </h2>
          
          <div className="space-y-4">
            {/* Nom du produit */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-2">
                Nom du produit *
              </label>
              <input
                {...form.register('name')}
                type="text"
                id="name"
                placeholder="Ex: Pommes Golden"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors ${
                  errors.name ? 'border-error-50' : 'border-neutral-300'
                }`}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-error-50 mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Marque avec suggestions */}
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-neutral-700 mb-2">
                Marque
              </label>
              <div className="relative">
                <input
                  {...form.register('brand')}
                  type="text"
                  id="brand"
                  placeholder="Ex: Leclerc"
                  list="brands-list"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  disabled={isLoading}
                />
                <datalist id="brands-list">
                  {recentValues.brands.map((brand: string) => (
                    <option key={brand} value={brand} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Catégorie */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-neutral-700 mb-2">
                Catégorie *
              </label>
              <select
                {...form.register('category')}
                id="category"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors ${
                  errors.category ? 'border-error-50' : 'border-neutral-300'
                }`}
                disabled={isLoading}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-sm text-error-50 mt-1">{errors.category.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Quantité et stockage */}
        <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4">
          <h2 className="text-xl font-medium text-neutral-900 mb-4 flex items-center gap-2">
            <PackageOpen className="size-5 text-success-50" />
            Quantité et stockage
          </h2>
          
          <div className="space-y-4">
            {/* Quantité */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-neutral-700 mb-2">
                  Quantité *
                </label>
                <input
                  {...form.register('quantity', { valueAsNumber: true })}
                  type="number"
                  id="quantity"
                  placeholder="1"
                  min="1"
                  step="1"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors ${
                    errors.quantity ? 'border-error-50' : 'border-neutral-300'
                  }`}
                  disabled={isLoading}
                />
                {errors.quantity && (
                  <p className="text-sm text-error-50 mt-1">{errors.quantity.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="unitType" className="block text-sm font-medium text-neutral-700 mb-2">
                  Unité
                </label>
                <select
                  {...form.register('unitType')}
                  id="unitType"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  disabled={isLoading}
                >
                  {UNIT_TYPES.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lieu de stockage avec suggestions */}
            <div>
              <label htmlFor="storageLocation" className="block text-sm font-medium text-neutral-700 mb-2">
                Lieu de stockage
              </label>
              <select
                {...form.register('storageLocation')}
                id="storageLocation"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                disabled={isLoading}
              >
                {STORAGE_LOCATIONS.map((location) => (
                  <option key={location.value} value={location.value}>
                    {location.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Dates et prix */}
        <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4">
          <h2 className="text-xl font-medium text-neutral-900 mb-4 flex items-center gap-2">
            <Calendar className="size-5 text-success-50" />
            Dates et prix
          </h2>
          
          <div className="space-y-4">
            {/* Date d'achat */}
            <div>
              <label htmlFor="purchaseDate" className="block text-sm font-medium text-neutral-700 mb-2">
                Date d'achat
              </label>
              <input
                {...form.register('purchaseDate')}
                type="date"
                id="purchaseDate"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors ${
                  errors.purchaseDate ? 'border-error-50' : 'border-neutral-300'
                }`}
                disabled={isLoading}
              />
              {errors.purchaseDate && (
                <p className="text-sm text-error-50 mt-1">{errors.purchaseDate.message}</p>
              )}
            </div>

            {/* Date de péremption */}
            <div>
              <label htmlFor="expiryDate" className="block text-sm font-medium text-neutral-700 mb-2">
                Date de péremption
              </label>
              <input
                {...form.register('expiryDate')}
                type="date"
                id="expiryDate"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors ${
                  errors.expiryDate ? 'border-error-50' : 'border-neutral-300'
                }`}
                disabled={isLoading}
              />
              {errors.expiryDate && (
                <p className="text-sm text-error-50 mt-1">{errors.expiryDate.message}</p>
              )}
            </div>

            {/* Prix d'achat */}
            <div>
              <label htmlFor="purchasePrice" className="block text-sm font-medium text-neutral-700 mb-2">
                Prix d'achat
              </label>
              <div className="relative">
                <input
                  {...form.register('purchasePrice', { valueAsNumber: true })}
                  type="number"
                  id="purchasePrice"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors ${
                    errors.purchasePrice ? 'border-error-50' : 'border-neutral-300'
                  }`}
                  disabled={isLoading}
                />
                <Euro className="absolute left-2.5 top-1/2 transform -translate-y-1/2 size-4 text-neutral-400" />
              </div>
              {errors.purchasePrice && (
                <p className="text-sm text-error-50 mt-1">{errors.purchasePrice.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Informations nutritionnelles */}
        <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4">
          <h2 className="text-xl font-medium text-neutral-900 mb-4 flex items-center gap-2">
            <Activity className="size-5 text-success-50" />
            Informations nutritionnelles
          </h2>
          
          <div className="space-y-4">
            {/* Nutriscore et Ecoscore */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="nutriscore" className="block text-sm font-medium text-neutral-700 mb-2">
                  Nutri-Score
                </label>
                <select
                  {...form.register('nutriscore')}
                  id="nutriscore"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  disabled={isLoading}
                >
                  {NUTRISCORE_OPTIONS.map((score) => (
                    <option key={score.value} value={score.value}>
                      {score.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="ecoscore" className="block text-sm font-medium text-neutral-700 mb-2">
                  Eco-Score
                </label>
                <select
                  {...form.register('ecoscore')}
                  id="ecoscore"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  disabled={isLoading}
                >
                  {ECOSCORE_OPTIONS.map((score) => (
                    <option key={score.value} value={score.value}>
                      {score.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Valeurs nutritionnelles */}
            <div>
              <h3 className="text-base font-medium text-neutral-800 mb-3 flex items-center gap-2">
                <Leaf className="size-4 text-success-50" />
                Valeurs nutritionnelles (pour 100g/100ml)
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="carbohydrates" className="block text-xs font-medium text-neutral-600 mb-1">
                    Glucides (g)
                  </label>
                  <input
                    {...form.register('nutritionalInfo.carbohydrates', { valueAsNumber: true })}
                    type="number"
                    id="carbohydrates"
                    placeholder="0.0"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                    disabled={isLoading}
                  />
                </div>
                
                <div>
                  <label htmlFor="proteins" className="block text-xs font-medium text-neutral-600 mb-1">
                    Protéines (g)
                  </label>
                  <input
                    {...form.register('nutritionalInfo.proteins', { valueAsNumber: true })}
                    type="number"
                    id="proteins"
                    placeholder="0.0"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                    disabled={isLoading}
                  />
                </div>
                
                <div>
                  <label htmlFor="fats" className="block text-xs font-medium text-neutral-600 mb-1">
                    Lipides (g)
                  </label>
                  <input
                    {...form.register('nutritionalInfo.fats', { valueAsNumber: true })}
                    type="number"
                    id="fats"
                    placeholder="0.0"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                    disabled={isLoading}
                  />
                </div>
                
                <div>
                  <label htmlFor="salt" className="block text-xs font-medium text-neutral-600 mb-1">
                    Sel (g)
                  </label>
                  <input
                    {...form.register('nutritionalInfo.salt', { valueAsNumber: true })}
                    type="number"
                    id="salt"
                    placeholder="0.0"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4">
          <h2 className="text-xl font-medium text-neutral-900 mb-4">
            Notes (optionnel)
          </h2>
          <textarea
            {...form.register('notes')}
            id="notes"
            placeholder="Ajouter des notes sur le produit..."
            rows={3}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors resize-none"
            disabled={isLoading}
          />
          {errors.notes && (
            <p className="text-sm text-error-50 mt-1">{errors.notes.message}</p>
          )}
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-neutral-100 text-neutral-700 font-medium rounded-lg text-center hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!isValid || isLoading}
            className="flex-1 px-4 py-3 bg-success-50 text-neutral-50 font-medium rounded-lg hover:bg-success-50/80 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Ajout en cours...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Ajouter le produit
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}