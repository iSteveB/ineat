import { createFileRoute, redirect } from "@tanstack/react-router";
import ProfileOnboardingPage from "@/pages/profile/ProfileOnboardingPage";
import { useAuthStore } from "@/stores/authStore";

export const Route = createFileRoute("/app/onboarding")({
  beforeLoad: () => {
    if (useAuthStore.getState().user?.profileOnboardingCompletedAt) {
      throw redirect({ to: "/app" });
    }
  },
  component: ProfileOnboardingPage,
});
