import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PrimaryGoal } from "@/schemas";
import { useAuthStore } from "@/stores/authStore";
import {
  ChevronLeft,
  User,
  Save,
  Loader2,
  Edit3,
  AlertCircle,
  Camera,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { toast } from "sonner";
import { AvatarUploadModal } from "@/features/profile/AvatarUploadModal";
import { getInitials } from "@/utils/ui-utils";

const PersonalInfoPage = () => {
  const user = useAuthStore((state) => state.user);
  const {
    updateProfile,
    isLoading,
    error: updateError,
    isSuccess,
  } = useUpdateProfile();

  const [personalInfo, setPersonalInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    emailConfirmation: "",
    defaultServings: user?.defaultServings ?? 4,
    primaryGoal: user?.primaryGoal ?? null,
  });

  useEffect(() => {
    if (user) {
      setPersonalInfo({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        emailConfirmation: "",
        defaultServings: user.defaultServings ?? 4,
        primaryGoal: user.primaryGoal ?? null,
      });
    }
  }, [user]);

  const [isEditing, setIsEditing] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Afficher un toast de succès quand la mise à jour réussit
  useEffect(() => {
    if (isSuccess) {
      toast.success("Profil mis à jour avec succès");
      setIsEditing(false);
    }
  }, [isSuccess]);

  // Afficher un toast d'erreur si la mise à jour échoue
  useEffect(() => {
    if (updateError) {
      toast.error(updateError);
    }
  }, [updateError]);

  const handlePersonalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsEditing(true);
    const { name, value } = e.target;
    setPersonalInfo((prev) => ({ ...prev, [name]: value }));

    // Clear email error when user types
    if (name === "email" || name === "emailConfirmation") {
      setEmailError("");
    }
  };

  const validateEmails = (): boolean => {
    if (personalInfo.email === user?.email) {
      setEmailError("");
      return true;
    }
    if (personalInfo.email !== personalInfo.emailConfirmation) {
      setEmailError("Les adresses email ne correspondent pas");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handlePersonalSubmit = async () => {
    if (!validateEmails()) {
      return;
    }

    try {
      await updateProfile({
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        email: personalInfo.email,
        defaultServings: personalInfo.defaultServings,
        primaryGoal: personalInfo.primaryGoal as PrimaryGoal | null,
      });
    } catch (err) {
      // L'erreur est déjà gérée par le hook et affichée via toast
      console.error("Erreur lors de la mise à jour du profil:", err);
    }
  };

  const handleAvatarClick = () => {
    setIsAvatarModalOpen(true);
  };

  const emailChanged = personalInfo.email !== user?.email;
  const emailsMatch = personalInfo.email === personalInfo.emailConfirmation;
  const showEmailError = Boolean(emailError && emailChanged);

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
        <h1 className="type-h1 text-neutral-900">Informations personnelles</h1>
        <p className="text-neutral-600">Gérez vos données</p>
      </header>

      <div className="flex flex-col gap-4 lg:gap-6">
        {/* ===== SECTION PHOTO DE PROFIL ===== */}
        <Card className="border border-neutral-200 shadow-sm">
          <CardContent className="p-6 flex flex-col items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleAvatarClick}
              aria-label="Modifier la photo de profil"
              className="group relative flex size-28 items-center justify-center overflow-hidden rounded-full bg-accent-600 shadow-md transition-shadow hover:shadow-lg"
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-4xl font-semibold text-surface" aria-hidden="true">
                  {getInitials(user?.firstName ?? "", user?.lastName ?? "") || (
                    <User className="size-12" />
                  )}
                </span>
              )}
              <span
                className="absolute inset-x-0 bottom-0 flex justify-center bg-neutral-950/55 py-1.5 text-surface opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                aria-hidden="true"
              >
                <Camera className="size-4" />
              </span>
            </button>

            {/* Informations utilisateur */}
            <div className="text-center">
              <h2 className="type-h2 text-neutral-900">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-sm text-neutral-600">{user?.email}</p>
            </div>

            {/* Bouton d'édition de profil */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAvatarClick}
              className="mt-2"
            >
              <Edit3 aria-hidden="true" />
              Modifier la photo
            </Button>
          </CardContent>
        </Card>

        {/* ===== FORMULAIRE D'INFORMATIONS PERSONNELLES ===== */}
        <Card className="border border-neutral-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5 text-accent-700" />
              Informations de base
            </CardTitle>
            <CardDescription>
              Mettez à jour vos informations personnelles
            </CardDescription>
          </CardHeader>
          <div>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={personalInfo.firstName}
                    onChange={handlePersonalChange}
                    required
                    className="bg-neutral-50 border-neutral-200 focus:ring-accent-600/20 focus:border-accent-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={personalInfo.lastName}
                    onChange={handlePersonalChange}
                    required
                    className="bg-neutral-50 border-neutral-200 focus:ring-accent-600/20 focus:border-accent-700"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={personalInfo.email}
                  onChange={handlePersonalChange}
                  required
                  className={cn(
 "bg-neutral-50 border-neutral-200 focus:ring-accent-600/20 focus:border-accent-700",
                    showEmailError &&
 "border-danger-600 focus:ring-danger-600/20 focus:border-danger-600",
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailConfirmation">Confirmer l'email</Label>
                <Input
                  id="emailConfirmation"
                  name="emailConfirmation"
                  type="email"
                  value={personalInfo.emailConfirmation}
                  onChange={handlePersonalChange}
                  required={emailChanged}
                  className={cn(
 "bg-neutral-50 border-neutral-200 focus:ring-accent-600/20 focus:border-accent-700",
                    showEmailError &&
 "border-danger-600 focus:ring-danger-600/20 focus:border-danger-600",
                  )}
                />
                {showEmailError && (
                  <div className="flex items-center gap-2 text-sm text-danger-700 mt-1">
                    <AlertCircle className="size-4" />
                    <span>{emailError}</span>
                  </div>
                )}
                {!showEmailError &&
                  emailChanged &&
                  personalInfo.emailConfirmation.length > 0 &&
                  emailsMatch && (
                    <div className="flex items-center gap-2 text-sm text-accent-700 mt-1">
                      <svg
                        className="size-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Les emails correspondent</span>
                    </div>
                  )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="defaultServings">
                    Nombre habituel de couverts
                  </Label>
                  <Input
                    id="defaultServings"
                    type="number"
                    min={1}
                    max={20}
                    value={personalInfo.defaultServings}
                    onChange={(event) => {
                      setIsEditing(true);
                      setPersonalInfo((prev) => ({
                        ...prev,
                        defaultServings: Number(event.target.value),
                      }));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primaryGoal">Objectif principal</Label>
                  <select
                    id="primaryGoal"
                    value={personalInfo.primaryGoal ?? ""}
                    onChange={(event) => {
                      setIsEditing(true);
                      setPersonalInfo((prev) => ({
                        ...prev,
                        primaryGoal: (event.target.value ||
                          null) as PrimaryGoal | null,
                      }));
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Aucun objectif sélectionné</option>
                    <option value="REDUCE_WASTE">Réduire le gaspillage</option>
                    <option value="SAVE_MONEY">Économiser</option>
                    <option value="EAT_BETTER">Mieux manger</option>
                    <option value="FIND_MEAL_IDEAS">
                      Trouver des idées de repas
                    </option>
                  </select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handlePersonalSubmit}
                className="w-full h-12 text-surface shadow-lg hover:shadow-xl transition-all duration-300"
                disabled={!isEditing || isLoading}
              >
                {isLoading ? (
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
            </CardFooter>
          </div>
        </Card>
      </div>

      {/* Modal de modification d'avatar */}
      <AvatarUploadModal
        open={isAvatarModalOpen}
        onOpenChange={setIsAvatarModalOpen}
        currentAvatarUrl={user?.avatarUrl || null}
      />
    </div>
  );
};

export default PersonalInfoPage;
