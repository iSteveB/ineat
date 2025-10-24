import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Crown, 
  Check, 
  X, 
  Sparkles, 
  Camera, 
  BarChart3, 
  Users, 
  Shield,
  Zap,
  Star
} from 'lucide-react';
import { useUser } from '@/hooks/useAuth';

// ===== TYPES =====

/**
 * Types d'abonnement disponibles
 */
type SubscriptionType = 'FREE' | 'PREMIUM';

/**
 * Détails d'un plan d'abonnement
 */
interface SubscriptionPlan {
  id: SubscriptionType;
  name: string;
  price: number;
  priceDisplay: string;
  description: string;
  features: string[];
  limitations?: string[];
  popular?: boolean;
  buttonText: string;
  buttonVariant: 'outline';
}

// ===== DONNÉES DES PLANS =====

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'FREE',
    name: 'Gratuit',
    price: 0,
    priceDisplay: '0€',
    description: 'Parfait pour débuter avec InEat',
    features: [
      'Gestion de base de l\'inventaire',
      'Ajout manuel des produits',
      'Suivi des dates d\'expiration',
      'Listes de courses simples',
      'Jusqu\'à 50 produits',
    ],
    limitations: [
      'Pas de scan de tickets',
      'Pas d\'analyses avancées',
      'Support par email uniquement',
    ],
    buttonText: 'Plan actuel',
    buttonVariant: 'outline',
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    price: 4.99,
    priceDisplay: '4,99€',
    description: 'Toutes les fonctionnalités pour une gestion optimale',
    features: [
      'Tout du plan Gratuit',
      '📸 Scan de tickets de caisse',
      '📊 Analyses et statistiques détaillées',
      '👥 Partage familial (jusqu\'à 5 membres)',
      '🔄 Synchronisation multi-appareils',
      '🎯 Suggestions personnalisées',
      '📈 Rapports de consommation',
      '🛡️ Support prioritaire',
      '♾️ Produits illimités',
    ],
    popular: true,
    buttonText: 'Commencer Premium',
    buttonVariant: 'outline',
  },
];

// ===== COMPOSANT PRINCIPAL =====

/**
 * Page de gestion des abonnements
 * Affiche les plans disponibles et permet la souscription/changement
 */
export const SubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);

  const currentPlan = user?.subscription || 'FREE';
  const isPremium = currentPlan === 'PREMIUM';

  // ===== HANDLERS =====

  /**
   * Gère la souscription à un plan
   */
  const handleSubscribe = async (planId: SubscriptionType) => {
    if (planId === currentPlan) {
      toast.info('Vous êtes déjà sur ce plan');
      return;
    }

    setIsProcessing(true);

    try {
      // TODO: Implémenter l'appel API pour la souscription
      // await subscriptionService.subscribe(planId);
      
      // Simulation pour le moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (planId === 'PREMIUM') {
        toast.success('Abonnement Premium activé avec succès !');
      } else {
        toast.success('Retour au plan gratuit effectué');
      }

      // Rediriger vers l'inventaire ou la page précédente
      navigate({ to: '/app/inventory' });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la souscription';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Gère le retour à la page précédente
   */
  const handleGoBack = () => {
    navigate({ to: '/app/inventory' });
  };

  // ===== RENDU =====

  /**
   * Rendu de l'en-tête
   */
  const renderHeader = () => (
    <div className="text-center mb-8">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGoBack}
          className="p-2"
        >
          <ArrowLeft className="size-4" />
        </Button>
        
        {isPremium && (
          <Badge variant="outline" className="gap-1">
            <Crown className="size-3 text-yellow-500" />
            Premium actif
          </Badge>
        )}
      </div>

      <div className="flex justify-center mb-4">
        <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Crown className="size-8 text-primary" />
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-2">Choisissez votre plan</h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
        Débloquez toutes les fonctionnalités d'InEat avec Premium
      </p>
    </div>
  );

  /**
   * Rendu des fonctionnalités premium en avant
   */
  const renderPremiumHighlights = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="text-center">
        <CardContent className="p-6">
          <Camera className="size-12 text-primary mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Scan de tickets</h3>
          <p className="text-sm text-muted-foreground">
            Ajoutez vos courses instantanément en photographiant vos tickets
          </p>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardContent className="p-6">
          <BarChart3 className="size-12 text-primary mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Analyses détaillées</h3>
          <p className="text-sm text-muted-foreground">
            Suivez vos habitudes et optimisez vos dépenses alimentaires
          </p>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardContent className="p-6">
          <Users className="size-12 text-primary mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Partage familial</h3>
          <p className="text-sm text-muted-foreground">
            Gérez l'inventaire à plusieurs avec votre famille
          </p>
        </CardContent>
      </Card>
    </div>
  );

  /**
   * Rendu d'une carte de plan
   */
  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isCurrentPlan = plan.id === currentPlan;
    const isUpgrade = plan.id === 'PREMIUM' && currentPlan === 'FREE';

    return (
      <Card 
        key={plan.id}
        className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''} ${
          isCurrentPlan ? 'ring-2 ring-primary' : ''
        }`}
      >
        {plan.popular && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground gap-1">
              <Star className="size-3" />
              Le plus populaire
            </Badge>
          </div>
        )}

        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl">{plan.name}</CardTitle>
          <div className="flex items-end justify-center gap-1">
            <span className="text-4xl font-bold">{plan.priceDisplay}</span>
            {plan.price > 0 && (
              <span className="text-muted-foreground mb-1">/mois</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Fonctionnalités */}
          <div className="space-y-3">
            {plan.features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <Check className="size-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>

          {/* Limitations (pour le plan gratuit) */}
          {plan.limitations && (
            <div className="space-y-3 pt-3 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Limitations :</h4>
              {plan.limitations.map((limitation, index) => (
                <div key={index} className="flex items-start gap-3">
                  <X className="size-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{limitation}</span>
                </div>
              ))}
            </div>
          )}

          {/* Bouton d'action */}
          <Button
            onClick={() => handleSubscribe(plan.id)}
            disabled={isCurrentPlan || isProcessing}
            variant={plan.buttonVariant}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full" />
                Traitement...
              </div>
            ) : isCurrentPlan ? (
              plan.buttonText
            ) : isUpgrade ? (
              <div className="flex items-center gap-2">
                <Zap className="size-4" />
                {plan.buttonText}
              </div>
            ) : (
              plan.buttonText
            )}
          </Button>

          {isCurrentPlan && (
            <div className="text-center">
              <Badge variant="secondary" className="gap-1">
                <Shield className="size-3" />
                Plan actuel
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  /**
   * Rendu des garanties et informations
   */
  const renderFooterInfo = () => (
    <div className="mt-12 text-center space-y-4">
      <Alert>
        <Sparkles className="size-4" />
        <AlertDescription>
          <strong>Garantie satisfait ou remboursé 30 jours.</strong> Vous pouvez annuler votre abonnement à tout moment.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2">
          <Shield className="size-4" />
          <span>Paiement sécurisé</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <X className="size-4" />
          <span>Annulation facile</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Crown className="size-4" />
          <span>Support prioritaire</span>
        </div>
      </div>
    </div>
  );

  // ===== RENDU PRINCIPAL =====

  // Chargement
  if (userLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Chargement de votre profil...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {renderHeader()}
        {renderPremiumHighlights()}
        
        {/* Plans d'abonnement */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {subscriptionPlans.map(renderPlanCard)}
        </div>
        
        {renderFooterInfo()}
      </div>
    </div>
  );
};

export default SubscriptionPage;