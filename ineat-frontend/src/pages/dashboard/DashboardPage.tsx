import { useEffect, type FC, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarX,
  ChefHat,
  Clock,
  HeartPulse,
  Loader2,
  Package,
  PackagePlus,
  ScanLine,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import PriorityAction, { type PriorityTone } from "@/components/common/PriorityAction";
import StatCard from "@/components/common/StatCard";

import { InventoryWidget } from "@/features/inventory/InventoryWidget";
import ScoreWidget from "@/features/score/ScoreWidget";
import { BudgetWidget } from "@/features/budget/BudgetWidget";
import { RecentProductsWidget } from "@/features/product/RecentProductsWidget";
import { ExpiringProductsWidget } from "@/features/product/ExpiringProductsWidget";
import { Button } from "@/components/ui/button";

import { inventoryService } from "@/services/inventoryService";
import { ApiRequestError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/authStore";
import { PrimaryGoal } from "@/schemas";

type DashboardAction = {
  title: string;
  description: string;
  actionLabel: string;
  icon: LucideIcon;
  to:
    | "/app/inventory"
    | "/app/inventory/add"
    | "/app/budget"
    | "/app/recipes/suggestions";
  tone: PriorityTone;
};

const goalActions: Record<PrimaryGoal, DashboardAction> = {
  REDUCE_WASTE: {
    title: "Priorité anti-gaspillage",
    description:
      "Commencez par les produits qui expirent bientôt et transformez-les en repas.",
    actionLabel: "Voir les produits",
    icon: TriangleAlert,
    to: "/app/inventory",
    tone: "warning",
  },
  SAVE_MONEY: {
    title: "Gardez votre budget sous contrôle",
    description:
      "Consultez vos dépenses alimentaires et ajustez le reste du mois.",
    actionLabel: "Voir mon budget",
    icon: Wallet,
    to: "/app/budget",
    tone: "accent",
  },
  EAT_BETTER: {
    title: "Mieux manger au quotidien",
    description:
      "Consultez la qualité nutritionnelle des produits réellement présents chez vous.",
    actionLabel: "Voir mon inventaire",
    icon: HeartPulse,
    to: "/app/inventory",
    tone: "accent",
  },
  FIND_MEAL_IDEAS: {
    title: "Que cuisiner aujourd’hui ?",
    description:
      "Générez des idées de repas à partir des produits de votre inventaire.",
    actionLabel: "Trouver une recette",
    icon: ChefHat,
    to: "/app/recipes/suggestions",
    tone: "accent",
  },
};

const Dashboard: FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // ===== RÉCUPÉRATION DES DONNÉES =====

  // Récupération de l'inventaire complet pour le ScoreWidget
  const {
    data: scoreInventory = [],
    isLoading: isLoadingInventory,
    error: inventoryError,
  } = useQuery({
    queryKey: ["dashboardScoreInventory"],
    queryFn: () => inventoryService.getInventory({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: inventoryStats,
    isLoading: isLoadingStats,
    error: statsError,
  } = useQuery({
    queryKey: ["inventoryStats"],
    queryFn: () => inventoryService.getInventoryStats(),
    staleTime: 2 * 60 * 1000,
  });

  // Récupération des produits récents (5 derniers)
  const {
    data: recentProducts = [],
    isLoading: isLoadingRecent,
    error: recentError,
  } = useQuery({
    queryKey: ["recentProducts"],
    queryFn: () => inventoryService.getRecentProducts(5),
    staleTime: 60 * 1000,
  });

  // Récupération des produits qui expirent dans les 7 prochains jours
  const {
    data: expiringProducts = [],
    isLoading: isLoadingExpiring,
    error: expiringError,
  } = useQuery({
    queryKey: ["expiringProducts"],
    queryFn: () =>
      inventoryService.getInventory({ expiringWithinDays: 7, limit: 20 }),
    staleTime: 60 * 1000,
  });

  // ===== CALCULS DÉRIVÉS =====

  // État de chargement global
  const isLoading =
    isLoadingInventory ||
    isLoadingStats ||
    isLoadingRecent ||
    isLoadingExpiring;

  // Gestion des erreurs
  const error = inventoryError || statsError || recentError || expiringError;
  const isAuthenticationError =
    error instanceof ApiRequestError && error.status === 401;

  useEffect(() => {
    if (isAuthenticationError) {
      void navigate({ to: "/login", replace: true });
    }
  }, [isAuthenticationError, navigate]);

  const totalInventoryItems =
    inventoryStats?.totalQuantity ??
    scoreInventory.reduce((total, item) => total + (item.quantity ?? 0), 0);

  const inventoryAction: DashboardAction =
    expiringProducts.length > 0
      ? {
          title: `${expiringProducts.length} produit${expiringProducts.length > 1 ? "s" : ""} à traiter`,
          description:
            "Commencez par consommer, déplacer ou retirer les produits qui expirent bientôt.",
          actionLabel: "Voir les produits",
          icon: TriangleAlert,
          to: "/app/inventory",
          tone: "warning",
        }
      : totalInventoryItems === 0
        ? {
            title: "Inventaire vide",
            description:
              "Ajoutez votre premier produit pour activer les alertes et le budget alimentaire.",
            actionLabel: "Ajouter mon premier produit",
            icon: Package,
            to: "/app/inventory/add",
            tone: "info",
          }
        : {
            title: "Inventaire à jour",
            description:
              "Ajoutez vos derniers achats pour garder le stock fiable.",
            actionLabel: "Ajouter mes achats",
            icon: PackagePlus,
            to: "/app/inventory/add",
            tone: "accent",
          };
  const priorityAction = user?.primaryGoal
    ? goalActions[user.primaryGoal]
    : inventoryAction;

  const inventoryWidget = (
    <InventoryWidget
      key="inventory"
      totalProducts={inventoryStats?.totalQuantity}
      soonExpiringCount={
        (inventoryStats?.expiryBreakdown.critical ?? 0) +
        (inventoryStats?.expiryBreakdown.warning ?? 0)
      }
      criticalCount={inventoryStats?.expiryBreakdown.critical}
      expiredCount={inventoryStats?.expiryBreakdown.expired}
    />
  );
  const scoreWidget = <ScoreWidget key="score" inventory={scoreInventory} />;
  const budgetWidget = <BudgetWidget key="budget" />;
  const recentWidget = (
    <RecentProductsWidget key="recent" products={recentProducts} />
  );
  const expiringWidget = (
    <ExpiringProductsWidget key="expiring" products={expiringProducts} />
  );

  const widgetsByGoal: Record<PrimaryGoal, ReactNode[]> = {
    REDUCE_WASTE: [
      expiringWidget,
      inventoryWidget,
      recentWidget,
      scoreWidget,
      budgetWidget,
    ],
    SAVE_MONEY: [
      budgetWidget,
      inventoryWidget,
      expiringWidget,
      recentWidget,
      scoreWidget,
    ],
    EAT_BETTER: [
      scoreWidget,
      inventoryWidget,
      expiringWidget,
      recentWidget,
      budgetWidget,
    ],
    FIND_MEAL_IDEAS: [
      inventoryWidget,
      expiringWidget,
      recentWidget,
      scoreWidget,
      budgetWidget,
    ],
  };
  const dashboardWidgets = user?.primaryGoal
    ? widgetsByGoal[user.primaryGoal]
    : [
        inventoryWidget,
        scoreWidget,
        budgetWidget,
        recentWidget,
        expiringWidget,
      ];

  const expiredCount = inventoryStats?.expiryBreakdown.expired ?? 0;
  const todayLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  // ===== GESTION DES ÉTATS =====

  if (isLoading) {
    return (
      <div
        role="status"
        className="flex min-h-[60vh] items-center justify-center gap-3 text-neutral-600"
      >
        <Loader2 className="size-6 animate-spin text-accent-600" aria-hidden="true" />
        Chargement du tableau de bord…
      </div>
    );
  }

  if (isAuthenticationError) {
    return null;
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-12">
        <div role="alert" className="card p-6 text-center">
          <p className="font-medium text-danger-700">
            Impossible de charger les données du tableau de bord.
          </p>
          <p className="mt-2 text-sm text-neutral-600">
            {error instanceof Error ? error.message : "Erreur inconnue"}
          </p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  // ===== RENDU DU DASHBOARD =====

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:gap-6 lg:px-12 lg:py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-600 first-letter:uppercase">
            {todayLabel}
          </p>
          <h1 className="type-h1 text-neutral-900">
            Bonjour {user?.firstName || "et bienvenue"}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link to="/app/inventory/add/scan">
              <ScanLine aria-hidden="true" />
              Scanner
            </Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link to="/app/inventory/add">
              <PackagePlus aria-hidden="true" />
              Ajouter un produit
            </Link>
          </Button>
        </div>
      </header>

      <PriorityAction
        titleId="dashboard-priority-title"
        tone={priorityAction.tone}
        icon={priorityAction.icon}
        title={priorityAction.title}
        description={priorityAction.description}
        actionLabel={priorityAction.actionLabel}
        to={priorityAction.to}
      />

      <section aria-label="Chiffres clés" className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-6">
        <StatCard icon={Package} value={totalInventoryItems} label="en stock" />
        <StatCard
          icon={Clock}
          tone="warning"
          value={expiringProducts.length}
          label="à consommer"
        />
        <StatCard
          icon={CalendarX}
          tone={expiredCount > 0 ? "danger" : "accent"}
          value={expiredCount}
          label={expiredCount > 1 ? "périmés" : "périmé"}
        />
      </section>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 lg:gap-6">
        {dashboardWidgets}
      </div>
    </div>
  );
};

export default Dashboard;
