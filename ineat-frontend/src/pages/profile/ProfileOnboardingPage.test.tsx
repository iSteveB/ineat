import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProfileOnboardingPage from "./ProfileOnboardingPage";
import { userService } from "@/services/userService";
import { useAuthStore } from "@/stores/authStore";

const navigate = vi.fn();
const refreshProfile = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

vi.mock("@/services/userService", () => ({
  userService: {
    updatePersonalInfo: vi.fn(),
    updateDietaryRestrictions: vi.fn(),
  },
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

describe("ProfileOnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({
        user: {
          defaultServings: 4,
          primaryGoal: null,
          preferences: { allergens: [], diets: [] },
        },
        getProfile: refreshProfile,
      } as never),
    );
    vi.mocked(userService.updateDietaryRestrictions).mockResolvedValue({
      allergens: [],
      diets: [],
    });
    vi.mocked(userService.updatePersonalInfo).mockResolvedValue({} as never);
    refreshProfile.mockResolvedValue(undefined);
    navigate.mockResolvedValue(undefined);
  });

  it("enregistre les couverts, allergies et objectif", async () => {
    const user = userEvent.setup();
    render(<ProfileOnboardingPage />);

    const servings = screen.getByLabelText(
      "Pour combien de personnes cuisinez-vous habituellement ?",
    );
    await user.clear(servings);
    await user.type(servings, "2");
    await user.click(screen.getByLabelText("Gluten"));
    await user.click(
      screen.getByRole("button", { name: /Réduire le gaspillage/ }),
    );
    await user.click(
      screen.getByRole("button", { name: "Enregistrer et continuer" }),
    );

    await waitFor(() => {
      expect(userService.updateDietaryRestrictions).toHaveBeenCalledWith({
        allergens: ["gluten"],
      });
      expect(userService.updatePersonalInfo).toHaveBeenCalledWith({
        defaultServings: 2,
        primaryGoal: "REDUCE_WASTE",
        completeProfileOnboarding: true,
      });
      expect(navigate).toHaveBeenCalledWith({ to: "/app", replace: true });
    });
  });

  it("permet de terminer plus tard sans écraser les préférences", async () => {
    const user = userEvent.setup();
    render(<ProfileOnboardingPage />);

    await user.click(screen.getByRole("button", { name: "Plus tard" }));

    await waitFor(() => {
      expect(userService.updateDietaryRestrictions).not.toHaveBeenCalled();
      expect(userService.updatePersonalInfo).toHaveBeenCalledWith({
        completeProfileOnboarding: true,
      });
    });
  });
});
