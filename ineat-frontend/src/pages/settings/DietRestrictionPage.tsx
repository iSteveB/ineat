import { Link } from "@tanstack/react-router";
import { ChevronLeft, AlertTriangle, Leaf, Save, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
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
      <div className="min-h-screen bg-gradient-to-br from-surface to-info-50/30 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-neutral-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface to-info-50/30">
      {/* ===== HEADER ===== */}
      <div className="relative overflow-hidden bg-surface border-b border-gray-200 shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-info-50/30 to-brand-300/30 rounded-full blur-3xl -translate-y-16 translate-x-16" />

        <div className="relative px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="secondary" size="icon">
            	<Link to="/app/settings" aria-label="Retour aux paramètres">
            		<ChevronLeft aria-hidden="true" />
            	</Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">
                Restrictions alimentaires
              </h1>
              <p className="text-sm text-neutral-600">
                Gérez vos préférences alimentaires
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* ===== Section Allergies et intolérances ===== */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-surface to-neutral-50/50 shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-danger-50/20 to-danger-600/20 rounded-full blur-3xl -translate-y-16 translate-x-16" />
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
                  "flex items-center justify-center rounded-xl border-2 border-gray-200 bg-neutral-50 p-4 cursor-pointer transition-all duration-200 text-center",
                  selectedAllergens.length === 0
                    ? "border-accent-600 bg-accent-600/20 shadow-md text-accent-700 font-semibold"
                    : "text-neutral-600 hover:bg-surface",
                )}
              >
                <Input
                  type="checkbox"
                  id="allergen-none"
                  className="sr-only"
                  checked={selectedAllergens.length === 0}
                  onChange={() => setSelectedAllergens([])}
                />
                Aucune
              </Label>
              {COMMON_ALLERGENS.map((allergen) => (
                <Label
                  key={allergen.id}
                  htmlFor={`allergen-${allergen.id}`}
                  className={cn(
                    "flex items-center justify-center rounded-xl border-2 border-gray-200 bg-neutral-50 p-4 cursor-pointer transition-all duration-200 text-center",
                    selectedAllergens.includes(allergen.id)
                      ? "border-accent-600 bg-accent-600/20 shadow-md text-accent-700 font-semibold"
                      : "text-neutral-600 hover:bg-surface",
                  )}
                >
                  <Input
                    type="checkbox"
                    id={`allergen-${allergen.id}`}
                    className="sr-only"
                    checked={selectedAllergens.includes(allergen.id)}
                    onChange={() =>
                      toggleSelection(allergen.id, setSelectedAllergens)
                    }
                  />
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
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-surface to-neutral-50/50 shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent-600/20 to-accent-600/20 rounded-full blur-3xl -translate-y-16 translate-x-16" />
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
                    "flex items-center justify-center rounded-xl border-2 border-gray-200 bg-neutral-50 p-4 cursor-pointer transition-all duration-200 text-center",
                    selectedDiets.includes(diet.id)
                      ? "border-accent-600 bg-accent-600/20 shadow-md text-accent-700 font-semibold"
                      : "text-neutral-600 hover:bg-surface",
                  )}
                >
                  <Input
                    type="checkbox"
                    id={`diet-${diet.id}`}
                    className="sr-only"
                    checked={selectedDiets.includes(diet.id)}
                    onChange={() => toggleSelection(diet.id, setSelectedDiets)}
                  />
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
            className="w-full max-w-md h-12 bg-gradient-to-r from-accent-600 to-accent-600 hover:from-accent-600/90 hover:to-accent-600/90 text-surface shadow-lg hover:shadow-xl transition-all duration-300"
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
