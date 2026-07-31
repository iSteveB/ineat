import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DietaryRestrictionsPage from "./DietRestrictionPage";
import { userService } from "@/services/userService";

const refreshProfile = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/services/userService", () => ({
  userService: {
    getDietaryRestrictions: vi.fn(),
    updateDietaryRestrictions: vi.fn(),
  },
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: (
    selector: (state: { getProfile: typeof refreshProfile }) => unknown,
  ) => selector({ getProfile: refreshProfile }),
}));

describe("DietaryRestrictionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshProfile.mockResolvedValue(undefined);
    vi.mocked(userService.getDietaryRestrictions).mockResolvedValue({
      allergens: ["gluten"],
      diets: ["vegetarian"],
    });
    vi.mocked(userService.updateDietaryRestrictions).mockResolvedValue({
      allergens: [],
      diets: ["vegetarian"],
    });
  });

  it("charge les préférences et permet de sélectionner aucune allergie", async () => {
    const user = userEvent.setup();
    render(<DietaryRestrictionsPage />);

    await screen.findByText("Allergies et intolérances");
    expect(screen.getByLabelText("Gluten")).toBeChecked();

    await user.click(screen.getByLabelText("Aucune"));
    await user.click(
      screen.getByRole("button", { name: "Enregistrer les modifications" }),
    );

    await waitFor(() => {
      expect(userService.updateDietaryRestrictions).toHaveBeenCalledWith({
        allergens: [],
        diets: ["vegetarian"],
      });
    });
    expect(
      screen.getByText(/ne remplacent jamais la vérification/),
    ).toBeInTheDocument();
  });
});
