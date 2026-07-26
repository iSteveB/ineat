import React, { useRef, useState } from 'react';
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
  Star,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useRefreshUser, useUser } from '@/hooks/useAuth';
import type { SubscriptionPlan as UserSubscriptionPlan } from '@/schemas';
import {
  billingService,
  type BillingInterval,
} from '@/services/billingService';

// ===== TYPES =====

/**
 * Types d'abonnement disponibles
 */
type SubscriptionType = 'FREE' | 'TRIAL' | 'PREMIUM_MONTHLY' | 'PREMIUM_YEARLY';

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
  checkoutInterval?: BillingInterval;
}

const formatDate = (date?: string | null) => {
  if (!date) return null;

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
};

// ===== DONNÉES DES PLANS =====

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'FREE',
    name: 'Gratuit',
    price: 0,
    priceDisplay: '0€',
    description: 'Parfait pour débuter avec InEat',
    features: [
      'Inventaire limité à 50 articles',
      'Ajout manuel des produits',
      'Suivi des dates d\'expiration',
      'Budget alimentaire manuel',
    ],
    limitations: [
      'Pas de recettes',
      'Pas de génération IA de recettes',
      'Pas d\'import de facture Drive',
    ],
    buttonText: 'Plan actuel',
    buttonVariant: 'outline',
  },
  {
    id: 'PREMIUM_MONTHLY',
    name: 'Premium mensuel',
    price: 5.99,
    priceDisplay: '5,99€',
    description: 'Sans engagement, facturé chaque mois',
    features: [
      'Tout du plan Gratuit',
      'Inventaire jusqu’à 500 articles',
      'Recettes depuis l’inventaire',
      '100 générations IA de recettes par mois',
      '25 imports Drive par mois',
      'Synchronisation avec le budget alimentaire',
    ],
    buttonText: 'Commencer Premium',
    buttonVariant: 'outline',
    checkoutInterval: 'MONTHLY',
  },
  {
    id: 'PREMIUM_YEARLY',
    name: 'Premium annuel',
    price: 59.99,
    priceDisplay: '59,99€',
    description: 'Environ 2 mois offerts par rapport au mensuel',
    features: [
      'Tout du plan Premium mensuel',
      'Équivalent 5,00€ / mois',
      'Inventaire jusqu’à 500 articles',
      '100 générations IA de recettes par mois',
      '25 imports Drive par mois',
      'Annulation possible avant le renouvellement',
    ],
    popular: true,
    buttonText: 'Choisir l’annuel',
    buttonVariant: 'outline',
    checkoutInterval: 'YEARLY',
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
  const refreshUser = useRefreshUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTrialStarting, setIsTrialStarting] = useState(false);
  const [isPortalOpening, setIsPortalOpening] = useState(false);
  const [activePlanIndex, setActivePlanIndex] = useState(0);
  const plansCarouselRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const currentPlan: UserSubscriptionPlan = user?.subscriptionPlan || 'FREE';
  const effectivePlan = user?.effectivePlan || 'FREE';
  const isPremium = effectivePlan === 'PREMIUM';
  const isTrial = currentPlan === 'TRIAL';
  const isTrialExpired =
    currentPlan === 'TRIAL' && user?.subscriptionStatus === 'EXPIRED';
  const isPremiumExpired =
    currentPlan === 'PREMIUM' && user?.subscriptionStatus === 'EXPIRED';
  const canStartTrial = currentPlan === 'FREE' && !isPremium && !isTrialExpired;
  const capabilities = user?.capabilities;
  const trialEndsAt = formatDate(user?.trialEndsAt);
  const currentPeriodEndsAt = formatDate(user?.currentPeriodEndsAt);
  const isCancelledAtPeriodEnd =
    user?.subscriptionStatus === 'CANCELLED' && Boolean(user?.cancelAtPeriodEnd);
  const aiQuotaReached = Boolean(
    capabilities &&
      isPremium &&
      capabilities.canGenerateAiRecipes &&
      capabilities.aiRecipeGenerationRemaining === 0
  );
  const driveQuotaReached = Boolean(
    capabilities &&
      isPremium &&
      capabilities.canImportDrive &&
      capabilities.driveImportsRemaining === 0
  );

  // ===== HANDLERS =====

  /**
   * Gère la souscription à un plan
   */
  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (plan.id === 'FREE' && currentPlan === 'FREE' && !isTrialExpired) {
      toast.info('Vous êtes déjà sur ce plan');
      return;
    }

    if (!plan.checkoutInterval) {
      toast.info('Ce changement de plan sera bientôt disponible.');
      return;
    }

    setIsProcessing(true);

    try {
      const checkoutSession = await billingService.createCheckoutSession(
        plan.checkoutInterval
      );
      window.location.assign(checkoutSession.url);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la souscription';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartTrial = async () => {
    setIsTrialStarting(true);

    try {
      await billingService.startTrial();
      await refreshUser();
      toast.success('Votre essai Premium est actif pendant 3 jours.');
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Impossible d'activer l'essai gratuit.";
      toast.error(errorMessage);
    } finally {
      setIsTrialStarting(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsPortalOpening(true);

    try {
      const portalSession = await billingService.createPortalSession();
      window.location.assign(portalSession.url);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Impossible d'ouvrir la gestion de l'abonnement.";
      toast.error(errorMessage);
    } finally {
      setIsPortalOpening(false);
    }
  };

  /**
   * Gère le retour à la page précédente
   */
  const handleGoBack = () => {
    navigate({ to: '/app/inventory' });
  };

  const scrollToPlan = (index: number) => {
    const carousel = plansCarouselRef.current;
    const slide = carousel?.children.item(index) as HTMLElement | null;

    if (!slide) return;

    slide.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
    setActivePlanIndex(index);
  };

  const handleCarouselScroll = () => {
    const carousel = plansCarouselRef.current;
    if (!carousel) return;

    const carouselCenter = carousel.scrollLeft + carousel.clientWidth / 2;
    const closestIndex = Array.from(carousel.children).reduce(
      (closest, child, index) => {
        const element = child as HTMLElement;
        const slideCenter = element.offsetLeft + element.offsetWidth / 2;
        const closestElement = carousel.children.item(closest) as HTMLElement;
        const closestCenter =
          closestElement.offsetLeft + closestElement.offsetWidth / 2;

        return Math.abs(slideCenter - carouselCenter) <
          Math.abs(closestCenter - carouselCenter)
          ? index
          : closest;
      },
      0
    );

    setActivePlanIndex(closestIndex);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const touchStart = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;

    if (!touchStart || !touch) return;

    const horizontalDistance = touchStart.x - touch.clientX;
    const verticalDistance = touchStart.y - touch.clientY;

    if (
      Math.abs(horizontalDistance) < 50 ||
      Math.abs(horizontalDistance) <= Math.abs(verticalDistance)
    ) {
      return;
    }

    const nextIndex = Math.min(
      subscriptionPlans.length - 1,
      Math.max(0, activePlanIndex + (horizontalDistance > 0 ? 1 : -1))
    );
    scrollToPlan(nextIndex);
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
            {isTrial ? 'Trial actif' : 'Premium actif'}
          </Badge>
        )}
        {isTrialExpired && (
          <Badge variant="outline" className="gap-1">
            <X className="size-3 text-muted-foreground" />
            Trial expiré
          </Badge>
        )}
      </div>

      <div className="flex justify-center mb-4">
        <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Crown className="size-8 text-primary" />
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-2">Abonnement InEat</h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
        Premium débloque les recettes, l’IA, les imports Drive, le budget synchronisé et les limites étendues.
      </p>
    </div>
  );

  const renderPlanStatus = () => {
    if (isPremiumExpired) {
      return (
        <Alert className="mb-8 border-orange-200 bg-orange-50">
          <X className="size-4 text-orange-700" />
          <AlertDescription className="text-orange-800">
            Paiement non confirmé. Vos données sont conservées, choisissez une offre Premium pour réactiver l’accès.
          </AlertDescription>
        </Alert>
      );
    }

    if (isTrialExpired) {
      return (
        <Alert className="mb-8 border-orange-200 bg-orange-50">
          <X className="size-4 text-orange-700" />
          <AlertDescription className="text-orange-800">
            Votre essai Premium est terminé. Vos données sont conservées.
          </AlertDescription>
        </Alert>
      );
    }

    if (isTrial) {
      return (
        <Alert className="mb-8 border-primary/30 bg-primary/5">
          <Crown className="size-4 text-primary" />
          <AlertDescription>
            Trial actif: vous avez les droits Premium jusqu’au {trialEndsAt ?? 'terme de l’essai'}.
          </AlertDescription>
        </Alert>
      );
    }

    if (isCancelledAtPeriodEnd) {
      return (
        <Alert className="mb-8 border-orange-200 bg-orange-50">
          <Crown className="size-4 text-orange-700" />
          <AlertDescription className="text-orange-800">
            Votre abonnement restera actif jusqu’au {currentPeriodEndsAt ?? 'terme de la période payée'}.
          </AlertDescription>
        </Alert>
      );
    }

    if (!isPremium) {
      return (
        <Alert className="mb-8">
          <Sparkles className="size-4" />
          <AlertDescription>
            Essayez Premium gratuitement pendant 3 jours, sans carte bancaire.
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  const renderSubscriptionManagement = () => {
    if (!isPremium || isTrial) return null;

    return (
      <Card className="mb-8">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Gestion de l’abonnement</h2>
            <p className="text-sm text-muted-foreground">
              {isCancelledAtPeriodEnd
                ? `Premium reste actif jusqu’au ${currentPeriodEndsAt ?? 'terme de la période payée'}.`
                : `Facturation ${user?.billingInterval === 'YEARLY' ? 'annuelle' : 'mensuelle'} gérée par Stripe${
                    currentPeriodEndsAt ? `, renouvellement le ${currentPeriodEndsAt}` : ''
                  }.`}
            </p>
          </div>
          <Button
            onClick={handleManageSubscription}
            disabled={isPortalOpening || isProcessing}
            className="gap-2"
          >
            {isPortalOpening ? (
              <>
                <div className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full" />
                Ouverture...
              </>
            ) : (
              <>
                <CreditCard className="size-4" />
                Gérer mon abonnement
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderQuotaSummary = () => {
    if (!capabilities) return null;

    return (
      <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Inventaire</p>
          <p className="mt-1 text-lg font-semibold">{capabilities.inventoryLimit} articles</p>
        </div>
        <div className={`rounded-lg border p-4 ${aiQuotaReached ? 'border-orange-200 bg-orange-50' : 'border-neutral-200 bg-neutral-50'}`}>
          <p className="text-xs font-medium uppercase text-muted-foreground">IA recettes</p>
          <p className="mt-1 text-lg font-semibold">{capabilities.aiRecipeGenerationRemaining} restante{capabilities.aiRecipeGenerationRemaining > 1 ? 's' : ''}</p>
          {aiQuotaReached && (
            <p className="mt-1 text-sm text-orange-800">
              {isTrial ? 'Vous avez utilisé vos 10 générations d’essai.' : 'Vous avez atteint vos 100 générations ce mois-ci.'}
            </p>
          )}
        </div>
        <div className={`rounded-lg border p-4 ${driveQuotaReached ? 'border-orange-200 bg-orange-50' : 'border-neutral-200 bg-neutral-50'}`}>
          <p className="text-xs font-medium uppercase text-muted-foreground">Drive</p>
          <p className="mt-1 text-lg font-semibold">{capabilities.driveImportsRemaining} import{capabilities.driveImportsRemaining > 1 ? 's' : ''}</p>
          {driveQuotaReached && (
            <p className="mt-1 text-sm text-orange-800">
              Quota Drive atteint. Le prochain import sera disponible au renouvellement.
            </p>
          )}
        </div>
      </div>
    );
  };

  /**
   * Rendu des fonctionnalités premium en avant
   */
  const renderPremiumHighlights = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="text-center">
        <CardContent className="p-6">
          <Camera className="size-12 text-primary mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Import Drive</h3>
          <p className="text-sm text-muted-foreground">
            Importez vos factures Drive pour accélérer l'ajout au stock.
          </p>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardContent className="p-6">
          <BarChart3 className="size-12 text-primary mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Analyse assistée</h3>
          <p className="text-sm text-muted-foreground">
            Générez des idées de recettes avec l’IA et gardez un quota visible.
          </p>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardContent className="p-6">
          <Users className="size-12 text-primary mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Budget synchronisé</h3>
          <p className="text-sm text-muted-foreground">
            Les achats importés gardent le budget alimentaire à jour.
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
    const isPaidPlan =
      plan.id === 'PREMIUM_MONTHLY' || plan.id === 'PREMIUM_YEARLY';
    const isUpgrade = isPaidPlan && currentPlan === 'FREE';
    const isTrialCurrentPlan = false;
    const isPremiumCurrentPlan =
      isPaidPlan && currentPlan === 'PREMIUM' && isPremium && !isPremiumExpired;

    return (
      <Card
        className={`relative h-full ${plan.popular ? 'border-primary shadow-lg' : ''} ${
          isCurrentPlan || isTrialCurrentPlan ? 'ring-2 ring-primary' : ''
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
              <span className="text-muted-foreground mb-1">
                {plan.id === 'PREMIUM_YEARLY' ? '/an' : '/mois'}
              </span>
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
            onClick={() => handleSubscribe(plan)}
            disabled={
              isCurrentPlan ||
              isTrialCurrentPlan ||
              isPremiumCurrentPlan ||
              isProcessing
            }
            variant={plan.buttonVariant}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full" />
                Traitement...
              </div>
            ) : isCurrentPlan || isTrialCurrentPlan || isPremiumCurrentPlan ? (
              isTrialCurrentPlan
                ? 'Trial actif'
                : isPremiumCurrentPlan
                  ? 'Premium actif'
                  : plan.buttonText
            ) : isUpgrade ? (
              <div className="flex items-center gap-2">
                <Zap className="size-4" />
                {plan.buttonText}
              </div>
            ) : (
              plan.buttonText
            )}
          </Button>

          {!isPremium && plan.id === 'PREMIUM_MONTHLY' && (
            <div className="space-y-2">
              <Button
                onClick={handleStartTrial}
                disabled={!canStartTrial || isProcessing || isTrialStarting}
                variant="outline"
                className="w-full"
              >
                {isTrialStarting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full" />
                    Activation...
                  </div>
                ) : canStartTrial ? (
                  'Essayer 3 jours gratuitement'
                ) : (
                  'Essai déjà utilisé'
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Sans carte bancaire
              </p>
            </div>
          )}

          {(isCurrentPlan || isTrialCurrentPlan) && (
            <div className="text-center">
              <Badge variant="secondary" className="gap-1">
                <Shield className="size-3" />
                {isTrialCurrentPlan ? 'Droits Premium temporaires' : 'Plan actuel'}
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
          L’essai Trial donne les droits Premium pendant 3 jours. Une fois expiré, les droits Free s’appliquent automatiquement.
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
          <span>Quotas visibles</span>
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
        {renderPlanStatus()}
        {renderQuotaSummary()}
        {renderSubscriptionManagement()}
        {renderPremiumHighlights()}
        
        {/* Carousel des plans d'abonnement */}
        <section className="mb-8" aria-label="Plans d'abonnement">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Choisissez votre plan</h2>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Voir le plan précédent"
                onClick={() => scrollToPlan(activePlanIndex - 1)}
                disabled={activePlanIndex === 0}
              >
                <ChevronLeft className="size-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Voir le plan suivant"
                onClick={() => scrollToPlan(activePlanIndex + 1)}
                disabled={activePlanIndex === subscriptionPlans.length - 1}
              >
                <ChevronRight className="size-5" />
              </Button>
            </div>
          </div>

          <div
            ref={plansCarouselRef}
            onScroll={handleCarouselScroll}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={() => {
              touchStartRef.current = null;
            }}
            className="flex touch-pan-x snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-[5%] py-4 md:gap-6 md:px-[15%] lg:px-[27.5%]"
          >
            {subscriptionPlans.map((plan, index) => (
              <div
                key={plan.id}
                className="w-[90%] shrink-0 snap-center md:w-[70%] lg:w-[45%]"
                aria-label={`Plan ${index + 1} sur ${subscriptionPlans.length}`}
              >
                {renderPlanCard(plan)}
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-center gap-2" aria-label="Navigation des plans">
            {subscriptionPlans.map((plan, index) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => scrollToPlan(index)}
                aria-label={`Afficher le plan ${plan.name}`}
                aria-current={activePlanIndex === index ? 'true' : undefined}
                className={`h-2.5 rounded-full transition-all ${
                  activePlanIndex === index
                    ? 'w-8 bg-primary'
                    : 'w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>
        </section>
        
        {renderFooterInfo()}
      </div>
    </div>
  );
};

export default SubscriptionPage;
