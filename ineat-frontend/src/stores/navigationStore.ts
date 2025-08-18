import { create } from 'zustand';

interface NavigationState {
	isNavigationVisible: boolean;
	hideNavigation: () => void;
	showNavigation: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
	isNavigationVisible: true,
	hideNavigation: () => set({ isNavigationVisible: false }),
	showNavigation: () => set({ isNavigationVisible: true }),
}));