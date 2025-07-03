import React from 'react'
import { Link } from '@tanstack/react-router'
import { AddMethodCard } from '@/components/common/AddMethodCard'
import { 
  Scan, 
  Receipt, 
  Car, 
  ShoppingCart,
  ArrowLeft
} from 'lucide-react'

export const AddProductPage: React.FC = () => {
  // TODO: Récupérer le statut premium de l'utilisateur depuis le store
  const isPremiumUser = false // Placeholder

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-neutral-50 border-b border-neutral-100">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link 
              to="/app/inventory" 
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <ArrowLeft className="size-5 text-neutral-300" />
            </Link>
            
            <div className="flex items-center space-x-3">
              <div className="size-12 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
                {/* Avatar utilisateur - remplacer par l'avatar réel */}
                <div className="size-10 bg-neutral-300 rounded-full"></div>
              </div>
              <h1 className="text-xl font-semibold text-neutral-300 font-['Fredoka']">
                Ajouter un produit
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        <h2 className="text-lg font-semibold text-neutral-300 mb-6">
          Choisir une méthode d'ajout
        </h2>

        <div className="space-y-4">
          {/* Scanner un code-barre */}
          <AddMethodCard
            icon={<Scan className="size-6 text-neutral-300" />}
            title="Scanner un code-barre"
            description="Scanner directement le code-barre d'un produit."
            to="/app/inventory/add/scan"
          />

          {/* Scanner un ticket de caisse */}
          <AddMethodCard
            icon={<Receipt className="size-6 text-neutral-300" />}
            title="Scanner un ticket de caisse"
            description="Scanner un ticket de caisse pour ajouter des articles."
            to={isPremiumUser ? "/app/inventory/add/receipt" : "/app/upgrade"}
            isPremium={true}
            isDisabled={!isPremiumUser}
          />

          {/* Importer une facture Drive */}
          <AddMethodCard
            icon={<Car className="size-6 text-neutral-300" />}
            title="Importer une facture Drive"
            description="Importer vos achats depuis une facture Drive."
            to={isPremiumUser ? "/app/inventory/add/drive" : "/app/upgrade"}
            isPremium={true}
            isDisabled={!isPremiumUser}
          />

          {/* Ajouter manuellement */}
          <AddMethodCard
            icon={<ShoppingCart className="size-6 text-neutral-300" />}
            title="Ajout manuel"
            description="Entrer manuellement les détails du produit."
            to="/app/inventory/add/search"
          />
        </div>
      </div>
    </div>
  )
}