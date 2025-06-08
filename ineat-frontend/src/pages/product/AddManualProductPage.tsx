import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { 
  ArrowLeft, 
  Calendar,
  Package,
  Euro,
  Save,
  PackageOpen,
  Leaf,
  Activity
} from 'lucide-react';

interface ProductFormData {
  name: string;
  brand: string;
  category: string;
  quantity: string;
  unitType: string;
  purchaseDate: string;
  expiryDate: string;
  purchasePrice: string;
  storageLocation: string;
  notes: string;
  nutriscore: string;
  ecoscore: string;
  carbohydrates: string;
  proteins: string;
  fats: string;
  salt: string;
}

const CATEGORIES = [
  { value: '', label: 'Sélectionner une catégorie' },
  { value: 'fruits-legumes', label: 'Fruits & Légumes' },
  { value: 'viandes-poissons', label: 'Viandes & Poissons' },
  { value: 'produits-laitiers', label: 'Produits laitiers' },
  { value: 'epicerie-salee', label: 'Épicerie salée' },
  { value: 'epicerie-sucree', label: 'Épicerie sucrée' },
  { value: 'surgeles', label: 'Surgelés' },
  { value: 'boissons', label: 'Boissons' },
  { value: 'autres', label: 'Autres' },
];

const UNIT_TYPES = [
  { value: 'UNIT', label: 'Unité(s)' },
  { value: 'KG', label: 'Kilogramme(s)' },
  { value: 'G', label: 'Gramme(s)' },
  { value: 'L', label: 'Litre(s)' },
  { value: 'ML', label: 'Millilitre(s)' },
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
  { value: 'A', label: 'A - Très bonne qualité nutritionnelle' },
  { value: 'B', label: 'B - Bonne qualité nutritionnelle' },
  { value: 'C', label: 'C - Qualité nutritionnelle correcte' },
  { value: 'D', label: 'D - Qualité nutritionnelle faible' },
  { value: 'E', label: 'E - Qualité nutritionnelle très faible' },
];

const ECOSCORE_OPTIONS = [
  { value: '', label: 'Non défini' },
  { value: 'A', label: 'A - Très faible impact environnemental' },
  { value: 'B', label: 'B - Faible impact environnemental' },
  { value: 'C', label: 'C - Impact environnemental modéré' },
  { value: 'D', label: 'D - Impact environnemental élevé' },
  { value: 'E', label: 'E - Impact environnemental très élevé' },
];

export function AddManualProductPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    brand: '',
    category: '',
    quantity: '',
    unitType: 'UNIT',
    purchaseDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    purchasePrice: '',
    storageLocation: '',
    notes: '',
    nutriscore: '',
    ecoscore: '',
    carbohydrates: '',
    proteins: '', 
    fats: '',
    salt: '',
  });

  const handleInputChange = (field: keyof ProductFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Appeler l'API pour sauvegarder le produit
      console.log('Données du produit à sauvegarder:', formData);
      
      // Simulation d'un appel API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirection vers l'inventaire après succès
      navigate({ to: '/app/inventory' });
    } catch (error) {
      console.error('Erreur lors de l\'ajout du produit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.name.trim() && formData.category && formData.quantity;

  return (
    <div className="min-h-screen bg-primary-50">
      {/* Header */}
      <div className="bg-neutral-50 border-b border-t border-neutral-200 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <Link 
            to="/app/inventory/add-product" 
            className="p-2 -ml-2 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="size-6" />
          </Link>
          <h1 className="text-lg font-semibold text-neutral-900">
            Ajouter manuellement un produit
          </h1>
          <div className="size-9" /> {/* Espaceur pour centrer le titre */}
        </div>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
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
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ex: Pommes Golden"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                required
              />
            </div>

            {/* Marque */}
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-neutral-700 mb-2">
                Marque
              </label>
              <input
                type="text"
                id="brand"
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                placeholder="Ex: Leclerc"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              />
            </div>

            {/* Catégorie */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-neutral-700 mb-2">
                Catégorie *
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
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
                  type="number"
                  id="quantity"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  placeholder="1"
                  min="0"
                  step="0.1"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  required
                />
              </div>
              <div>
                <label htmlFor="unitType" className="block text-sm font-medium text-neutral-700 mb-2">
                  Unité
                </label>
                <select
                  id="unitType"
                  value={formData.unitType}
                  onChange={(e) => handleInputChange('unitType', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                >
                  {UNIT_TYPES.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lieu de stockage */}
            <div>
              <label htmlFor="storageLocation" className="block text-sm font-medium text-neutral-700 mb-2">
                Lieu de stockage
              </label>
              <select
                id="storageLocation"
                value={formData.storageLocation}
                onChange={(e) => handleInputChange('storageLocation', e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
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
                type="date"
                id="purchaseDate"
                value={formData.purchaseDate}
                onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              />
            </div>

            {/* Date de péremption */}
            <div>
              <label htmlFor="expiryDate" className="block text-sm font-medium text-neutral-700 mb-2">
                Date de péremption
              </label>
              <input
                type="date"
                id="expiryDate"
                value={formData.expiryDate}
                onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              />
            </div>

            {/* Prix d'achat */}
            <div>
              <label htmlFor="purchasePrice" className="block text-sm font-medium text-neutral-700 mb-2">
                Prix d'achat
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="purchasePrice"
                  value={formData.purchasePrice}
                  onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full pl-8 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                />
                <Euro className="absolute left-2.5 top-1/2 transform -translate-y-1/2 size-4 text-neutral-400" />
              </div>
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
                  id="nutriscore"
                  value={formData.nutriscore}
                  onChange={(e) => handleInputChange('nutriscore', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
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
                  id="ecoscore"
                  value={formData.ecoscore}
                  onChange={(e) => handleInputChange('ecoscore', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
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
                    type="number"
                    id="carbohydrates"
                    value={formData.carbohydrates}
                    onChange={(e) => handleInputChange('carbohydrates', e.target.value)}
                    placeholder="0.0"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  />
                </div>
                
                <div>
                  <label htmlFor="proteins" className="block text-xs font-medium text-neutral-600 mb-1">
                    Protéines (g)
                  </label>
                  <input
                    type="number"
                    id="proteins"
                    value={formData.proteins}
                    onChange={(e) => handleInputChange('proteins', e.target.value)}
                    placeholder="0.0"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  />
                </div>
                
                <div>
                  <label htmlFor="fats" className="block text-xs font-medium text-neutral-600 mb-1">
                    Lipides (g)
                  </label>
                  <input
                    type="number"
                    id="fats"
                    value={formData.fats}
                    onChange={(e) => handleInputChange('fats', e.target.value)}
                    placeholder="0.0"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  />
                </div>
                
                <div>
                  <label htmlFor="salt" className="block text-xs font-medium text-neutral-600 mb-1">
                    Sel (g)
                  </label>
                  <input
                    type="number"
                    id="salt"
                    value={formData.salt}
                    onChange={(e) => handleInputChange('salt', e.target.value)}
                    placeholder="0.0"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
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
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Ajouter des notes sur le produit..."
            rows={3}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-colors resize-none"
          />
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-3 pt-4">
          <Link
            to="/app/inventory/add-product"
            className="flex-1 px-4 py-3 bg-neutral-100 text-neutral-700 font-medium rounded-lg text-center hover:bg-neutral-200 transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className="flex-1 px-4 py-3 bg-success-50 text-neutral-50 font-medium rounded-lg hover:bg-success-50/80 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="size-4 border-2 border-neutral-50 border-t-transparent rounded-full animate-spin" />
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