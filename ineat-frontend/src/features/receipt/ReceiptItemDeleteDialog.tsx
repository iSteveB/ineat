import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  AlertTriangle, 
  Package,
  Euro
} from 'lucide-react';
import { type ReceiptItem, receiptService } from '@/services/receiptService';

// ===== TYPES =====

/**
 * Props du composant
 */
export interface ReceiptItemDeleteDialogProps {
  /** Item à supprimer */
  item: ReceiptItem | null;
  /** Indique si la dialog est ouverte */
  isOpen: boolean;
  /** Callback de fermeture */
  onClose: () => void;
  /** Callback de confirmation de suppression */
  onConfirm: (itemId: string) => void;
  /** Indique si la suppression est en cours */
  isLoading?: boolean;
}

// ===== COMPOSANT PRINCIPAL =====

/**
 * Dialog de confirmation de suppression d'un item de ticket
 * Affiche les détails de l'item et demande confirmation
 */
export const ReceiptItemDeleteDialog: React.FC<ReceiptItemDeleteDialogProps> = ({
  item,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  // ===== HANDLERS =====

  /**
   * Gère la confirmation de suppression
   */
  const handleConfirm = () => {
    if (item && !isLoading) {
      onConfirm(item.id);
    }
  };

  /**
   * Gère l'annulation
   */
  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  // ===== RENDU =====

  /**
   * Rendu des détails de l'item
   */
  const renderItemDetails = () => {
    if (!item) return null;

    return (
      <div className="space-y-4">
        {/* Informations principales */}
        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
          <Package className="size-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium">{item.detectedName}</h4>
            
            {/* Détails du produit */}
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">Quantité :</span> {item.quantity}
              </div>
              
              {item.unitPrice && (
                <div>
                  <span className="font-medium">Prix unitaire :</span> {receiptService.formatAmount(item.unitPrice)}
                </div>
              )}
              
              {item.totalPrice && (
                <div>
                  <span className="font-medium">Prix total :</span> {receiptService.formatAmount(item.totalPrice)}
                </div>
              )}
              
              {item.categoryGuess && (
                <div>
                  <span className="font-medium">Catégorie :</span> {item.categoryGuess}
                </div>
              )}
            </div>

            {/* Badges d'état */}
            <div className="flex gap-2 mt-3">
              {item.validated && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Validé
                </Badge>
              )}
              
              {item.product && (
                <Badge variant="secondary">
                  Produit associé
                </Badge>
              )}
              
              {item.confidence && (
                <Badge variant="outline">
                  Confiance : {Math.round(item.confidence * 100)}%
                </Badge>
              )}
            </div>

            {/* Produit associé */}
            {item.product && (
              <div className="mt-3 p-3 bg-blue-50 rounded border">
                <p className="text-sm font-medium text-blue-900">
                  Produit associé : {item.product.name}
                </p>
                {item.product.brand && (
                  <p className="text-xs text-blue-700">
                    Marque : {item.product.brand}
                  </p>
                )}
                <p className="text-xs text-blue-600">
                  Catégorie : {item.product.category.name}
                </p>
              </div>
            )}

            {/* Notes */}
            {item.notes && (
              <div className="mt-3 p-3 bg-gray-50 rounded border">
                <p className="text-sm font-medium text-gray-900 mb-1">Notes :</p>
                <p className="text-sm text-gray-700">{item.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Avertissements */}
        <div className="space-y-2">
          {item.validated && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <AlertTriangle className="size-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Item validé</p>
                <p className="text-yellow-700">
                  Cet item a été validé. Sa suppression pourrait affecter la cohérence du ticket.
                </p>
              </div>
            </div>
          )}

          {item.product && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded">
              <Package className="size-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">Produit associé</p>
                <p className="text-blue-700">
                  Cet item est associé à un produit existant. Seul l'item sera supprimé, pas le produit.
                </p>
              </div>
            </div>
          )}

          {(item.totalPrice && item.totalPrice > 0) && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded">
              <Euro className="size-4 text-red-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-800">Impact financier</p>
                <p className="text-red-700">
                  La suppression réduira le total du ticket de {receiptService.formatAmount(item.totalPrice)}.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5 text-destructive" />
            Supprimer cet item ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. L'item sera définitivement supprimé du ticket.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Détails de l'item */}
        {renderItemDetails()}

        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={handleCancel}
            disabled={isLoading}
          >
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full" />
                Suppression...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Trash2 className="size-4" />
                Supprimer
              </div>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ReceiptItemDeleteDialog;