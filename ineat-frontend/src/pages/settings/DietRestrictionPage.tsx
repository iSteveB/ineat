import { Link } from "@tanstack/react-router";
import { ChevronLeft, AlertTriangle, Leaf, Save, Loader2, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { userService } from "@/services/userService";
import { toast } from "sonner";
import { COMMON_ALLERGENS, COMMON_DIETS } from "@/constants/dietary";
import { useAuthStore } from "@/stores/authStore";

const DietaryRestrictionsPage = () => {
  const refreshProfile = useAuthStore((state) => state.getProfile);
  // État pour les allergènes et régimes sélectionnés
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les préférences au montage du composant
  useEffect(() => {
    const loadDietaryRestrictions = async () => {
      try {
        setIsLoading(true);
        const preferences = await userService.getDietaryRestrictions();
        setSelectedAllergens(preferences.allergens || []);
        setSelectedDiets(preferences.diets || []);
      } catch (error) {
        console.error("Erreur lors du chargement des préférences:", error);
        toast.error("Impossible de charger vos préférences alimentaires.");
      } finally {
        setIsLoading(false);
      }
    };

    loadDietaryRestrictions();
  }, []);

  // Gestionnaires d'événements
  const toggleSelection = (
    id: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setter((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Fonction de sauvegarde
  const savePreferences = async () => {
    try {
      setIsSaving(true);
      await userService.updateDietaryRestrictions({
        allergens: selectedAllergens,
        diets: selectedDiets,
      });
      await refreshProfile();

      toast.success("Vos préférences alimentaires ont été enregistrées.");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Impossible de sauvegarder vos préférences.");
    } finally {
      setIsSaving(false);
    }
  };

  // Afficher un loader pendant le chargement initial
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-neutral-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4 sm:px-6 lg:py-6">
      {/* ===== HEADER ===== */}
      <Button asChild variant="ghost" className="-ml-3 self-start">
        <Link to="/app/settings">
          <ChevronLeft aria-hidden="true" />
          Paramètres
        </Link>
      </Button>
      <header>
        <h1 className="type-h1 text-neutral-900">Restrictions alimentaires</h1>
        <p className="text-neutral-600">Gérez vos préférences alimentaires</p>
      </header>

      <div className="flex flex-col gap-4 lg:gap-6">
        {/* ===== Section Allergies et intolérances ===== */}
        <Card className="border border-neutral-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-danger-700" />
              Allergies et intolérances
            </CardTitle>
            <CardDescription>
              Sélectionnez les aliments auxquels vous êtes allergique ou
              intolérant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <Label
                htmlFor="allergen-none"
                className={cn(
 "group relative flex min-h-12 cursor-pointer items-center justify-center gap-1.5 rounded-lg border bg-surface px-3 py-2 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                  selectedAllergens.length === 0
                    ? "border-accent-600 bg-accent-50 font-semibold text-accent-800"
                    : "border-neutral-300 text-neutral-700 hover:border-accent-600",
                )}
              >
                <input
                  type="checkbox"
                  id="allergen-none"
                  className="sr-only"
                  checked={selectedAllergens.length === 0}
                  onChange={() => setSelectedAllergens([])}
                />
                  <Check className="hidden size-4 shrink-0 group-has-[:checked]:block" aria-hidden="true" />
                Aucune
              </Label>
              {COMMON_ALLERGENS.map((allergen) => (
                <Label
                  key={allergen.id}
                  htmlFor={`allergen-${allergen.id}`}
                  className={cn(
 "group relative flex min-h-12 cursor-pointer items-center justify-center gap-1.5 rounded-lg border bg-surface px-3 py-2 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                    selectedAllergens.includes(allergen.id)
                      ? "border-accent-600 bg-accent-50 font-semibold text-accent-800"
                      : "border-neutral-300 text-neutral-700 hover:border-accent-600",
                  )}
                >
                  <input
                    type="checkbox"
                    id={`allergen-${allergen.id}`}
                    className="sr-only"
                    checked={selectedAllergens.includes(allergen.id)}
                    onChange={() =>
                      toggleSelection(allergen.id, setSelectedAllergens)
                    }
                  />
                  <Check className="hidden size-4 shrink-0 group-has-[:checked]:block" aria-hidden="true" />
                  {allergen.label}
                </Label>
              ))}
            </div>
            <div className="mt-4 flex gap-2 rounded-lg bg-warning-50/20 p-3 text-sm text-neutral-700">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Les suggestions InEat ne remplacent jamais la vérification des
                ingrédients et des étiquettes.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ===== Section Régimes alimentaires ===== */}
        <Card className="border border-neutral-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="size-5 text-accent-700" />
              Régimes alimentaires
            </CardTitle>
            <CardDescription>
              Sélectionnez les régimes alimentaires que vous suivez.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {COMMON_DIETS.map((diet) => (
                <Label
                  key={diet.id}
                  htmlFor={`diet-${diet.id}`}
                  className={cn(
 "group relative flex min-h-12 cursor-pointer items-center justify-center gap-1.5 rounded-lg border bg-surface px-3 py-2 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                    selectedDiets.includes(diet.id)
                      ? "border-accent-600 bg-accent-50 font-semibold text-accent-800"
                      : "border-neutral-300 text-neutral-700 hover:border-accent-600",
                  )}
                >
                  <input
                    type="checkbox"
                    id={`diet-${diet.id}`}
                    className="sr-only"
                    checked={selectedDiets.includes(diet.id)}
                    onChange={() => toggleSelection(diet.id, setSelectedDiets)}
                  />
                  <Check className="hidden size-4 shrink-0 group-has-[:checked]:block" aria-hidden="true" />
                  {diet.label}
                </Label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ===== Bouton de sauvegarde ===== */}
        <div className="flex justify-center pt-4 pb-8">
          <Button
            onClick={savePreferences}
            className="w-full max-w-md h-12 text-surface shadow-lg hover:shadow-xl transition-all duration-300"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="size-4 mr-2" />
                Enregistrer les modifications
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DietaryRestrictionsPage;
