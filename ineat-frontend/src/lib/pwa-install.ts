const LOGIN_PROMPT_KEY = 'ineat:pwa:prompt-after-login';
const SNOOZE_UNTIL_KEY = 'ineat:pwa:snooze-until';
const INSTALLED_KEY = 'ineat:pwa:installed';

export const PWA_PROMPT_DELAY_MS = 1500;
export const PWA_SNOOZE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };
type InstallPromptListener = (promptAvailable: boolean) => void;

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
const installPromptListeners = new Set<InstallPromptListener>();

function notifyInstallPromptListeners() {
	for (const listener of installPromptListeners) {
		listener(deferredInstallPrompt !== null);
	}
}

export function isIosDevice(navigatorValue: Navigator = window.navigator) {
	return (
		/iPad|iPhone|iPod/.test(navigatorValue.userAgent) ||
		(navigatorValue.platform === 'MacIntel' && navigatorValue.maxTouchPoints > 1)
	);
}

export function isAndroidDevice(navigatorValue: Navigator = window.navigator) {
	return /Android/i.test(navigatorValue.userAgent);
}

export function isMobileInstallTarget(
	navigatorValue: Navigator = window.navigator
) {
	return isIosDevice(navigatorValue) || isAndroidDevice(navigatorValue);
}

export function isRunningAsInstalledApp(
	navigatorValue: NavigatorWithStandalone = window.navigator,
	standaloneMediaQuery = window.matchMedia('(display-mode: standalone)').matches
) {
	return standaloneMediaQuery || navigatorValue.standalone === true;
}

export function markPwaPromptAfterLogin(storage: Storage = window.sessionStorage) {
	storage.setItem(LOGIN_PROMPT_KEY, 'true');
}

export function shouldPromptAfterLogin(
	storage: Storage = window.sessionStorage
) {
	return storage.getItem(LOGIN_PROMPT_KEY) === 'true';
}

export function clearPwaPromptAfterLogin(
	storage: Storage = window.sessionStorage
) {
	storage.removeItem(LOGIN_PROMPT_KEY);
}

export function snoozePwaInstall(
	now = Date.now(),
	storage: Storage = window.localStorage
) {
	storage.setItem(SNOOZE_UNTIL_KEY, String(now + PWA_SNOOZE_DURATION_MS));
}

export function isPwaInstallSnoozed(
	now = Date.now(),
	storage: Storage = window.localStorage
) {
	const snoozeUntil = Number(storage.getItem(SNOOZE_UNTIL_KEY));
	return Number.isFinite(snoozeUntil) && snoozeUntil > now;
}

export function wasPwaInstalled(storage: Storage = window.localStorage) {
	return storage.getItem(INSTALLED_KEY) === 'true';
}

export function canShowPwaInstallPrompt({
	now = Date.now(),
	navigatorValue = window.navigator,
	standaloneMediaQuery = window.matchMedia('(display-mode: standalone)').matches,
	storage = window.localStorage,
}: {
	now?: number;
	navigatorValue?: NavigatorWithStandalone;
	standaloneMediaQuery?: boolean;
	storage?: Storage;
} = {}) {
	return (
		isMobileInstallTarget(navigatorValue) &&
		!isRunningAsInstalledApp(navigatorValue, standaloneMediaQuery) &&
		!isPwaInstallSnoozed(now, storage) &&
		!wasPwaInstalled(storage)
	);
}

export function hasNativeInstallPrompt() {
	return deferredInstallPrompt !== null;
}

export function subscribeToNativeInstallPrompt(listener: InstallPromptListener) {
	installPromptListeners.add(listener);
	listener(deferredInstallPrompt !== null);

	return () => {
		installPromptListeners.delete(listener);
	};
}

export async function requestNativePwaInstall() {
	const promptEvent = deferredInstallPrompt;
	if (!promptEvent) return 'unavailable' as const;

	await promptEvent.prompt();
	const { outcome } = await promptEvent.userChoice;
	deferredInstallPrompt = null;
	notifyInstallPromptListeners();

	if (outcome === 'accepted') {
		window.localStorage.setItem(INSTALLED_KEY, 'true');
	} else {
		snoozePwaInstall();
	}

	return outcome;
}

if (typeof window !== 'undefined') {
	window.addEventListener('beforeinstallprompt', (event) => {
		event.preventDefault();
		deferredInstallPrompt = event as BeforeInstallPromptEvent;
		notifyInstallPromptListeners();
	});

	window.addEventListener('appinstalled', () => {
		deferredInstallPrompt = null;
		window.localStorage.setItem(INSTALLED_KEY, 'true');
		notifyInstallPromptListeners();
	});
}
