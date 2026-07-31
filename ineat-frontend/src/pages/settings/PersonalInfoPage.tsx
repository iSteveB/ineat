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
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { toast } from "sonner";
import { AvatarUploadModal } from "@/features/profile/AvatarUploadModal";

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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-info-50/30">
      {/* ===== HEADER ===== */}
      <div className="relative overflow-hidden bg-neutral-50 border-b border-gray-200 shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-info-100/30 to-primary-100/30 rounded-full blur-3xl -translate-y-16 translate-x-16" />

        <div className="relative px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/app/settings">
              <Button
                variant="ghost"
                size="sm"
                className="size-10 p-0 rounded-xl bg-neutral-100 hover:bg-gray-100 border border-gray-200 shadow-sm"
              >
                <ChevronLeft className="size-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-neutral-300">
                Informations personnelles
              </h1>
              <p className="text-sm text-neutral-200">Gérez vos données</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* ===== SECTION PHOTO DE PROFIL ===== */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-neutral-50 to-neutral-100/50 shadow-xl">
          <div className="absolute top-0 right-0 size-32 bg-gradient-to-br from-success-50/20 to-primary-100/20 rounded-full blur-3xl -translate-y-16 translate-x-16" />
          <CardContent className="p-6 flex flex-col items-center justify-center gap-4">
            <div
              className="relative size-28 rounded-full bg-gradient-to-br from-success-50 to-success-50/80 flex items-center justify-center overflow-hidden shadow-lg group transition-all duration-300 hover:shadow-xl cursor-pointer"
              onClick={handleAvatarClick}
            >
              {/* Photo de profil */}
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="Photo de profil"
                  className="size-full object-cover transition-all duration-300 group-hover:scale-110"
                />
              ) : (
                <span className="text-4xl font-semibold text-neutral-50 transition-all duration-300 group-hover:scale-110">
                  {user?.firstName && user?.lastName ? (
                    `${user?.firstName[0]}${user?.lastName[0]}`
                  ) : (
                    <User className="size-12 text-neutral-50" />
                  )}
                </span>
              )}
            </div>

            {/* Informations utilisateur */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-neutral-300">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-sm text-neutral-200">{user?.email}</p>
            </div>

            {/* Bouton d'édition de profil */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAvatarClick}
              className="mt-2 text-success-50 hover:text-success-50/80 hover:bg-success-50/10 border border-success-50/20 hover:border-success-50/30 transition-all duration-200"
            >
              <Edit3 className="size-4 mr-2" />
              Modifier la photo
            </Button>
          </CardContent>
        </Card>

        {/* ===== FORMULAIRE D'INFORMATIONS PERSONNELLES ===== */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-neutral-50 to-neutral-100/50 shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-success-50/20 to-success-50/20 rounded-full blur-3xl -translate-y-16 translate-x-16" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5 text-success-50" />
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
                    className="bg-neutral-100 border-gray-200 focus:ring-success-50 focus:border-success-50"
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
                    className="bg-neutral-100 border-gray-200 focus:ring-success-50 focus:border-success-50"
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
                    "bg-neutral-100 border-gray-200 focus:ring-success-50 focus:border-success-50",
                    showEmailError &&
                      "border-red-500 focus:ring-red-500 focus:border-red-500",
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
                    "bg-neutral-100 border-gray-200 focus:ring-success-50 focus:border-success-50",
                    showEmailError &&
                      "border-red-500 focus:ring-red-500 focus:border-red-500",
                  )}
                />
                {showEmailError && (
                  <div className="flex items-center gap-2 text-sm text-red-500 mt-1">
                    <AlertCircle className="size-4" />
                    <span>{emailError}</span>
                  </div>
                )}
                {!showEmailError &&
                  emailChanged &&
                  personalInfo.emailConfirmation.length > 0 &&
                  emailsMatch && (
                    <div className="flex items-center gap-2 text-sm text-success-50 mt-1">
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
                className="w-full h-12 bg-gradient-to-r from-success-50 to-success-50 hover:from-success-50/90 hover:to-success-50/90 text-neutral-50 shadow-lg hover:shadow-xl transition-all duration-300"
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
