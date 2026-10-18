import { describe, expect, it } from 'vitest';
import {
	canShowPwaInstallPrompt,
	clearPwaPromptAfterLogin,
	isAndroidDevice,
	isIosDevice,
	isPwaInstallSnoozed,
	isRunningAsInstalledApp,
	markPwaPromptAfterLogin,
	PWA_SNOOZE_DURATION_MS,
	shouldPromptAfterLogin,
	snoozePwaInstall,
} from './pwa-install';

function navigatorStub(overrides: Partial<Navigator>): Navigator {
	return {
		userAgent: '',
		platform: '',
		maxTouchPoints: 0,
		...overrides,
	} as Navigator;
}

function storageStub(): Storage {
	const values = new Map<string, string>();
	return {
		get length() {
			return values.size;
		},
		clear: () => values.clear(),
		getItem: (key) => values.get(key) ?? null,
		key: (index) => [...values.keys()][index] ?? null,
		removeItem: (key) => values.delete(key),
		setItem: (key, value) => values.set(key, value),
	};
}

describe('PWA install helpers', () => {
	it('détecte Android, iPhone et iPadOS', () => {
		expect(isAndroidDevice(navigatorStub({ userAgent: 'Android 15' }))).toBe(true);
		expect(isIosDevice(navigatorStub({ userAgent: 'iPhone' }))).toBe(true);
		expect(
			isIosDevice(navigatorStub({ platform: 'MacIntel', maxTouchPoints: 5 }))
		).toBe(true);
	});

	it('détecte les modes standalone standard et iOS', () => {
		expect(isRunningAsInstalledApp(navigatorStub({}), true)).toBe(true);
		expect(
			isRunningAsInstalledApp(
				navigatorStub({ standalone: true } as Partial<Navigator>),
				false
			)
		).toBe(true);
	});

	it('conserve puis consomme le signal après connexion', () => {
		const storage = storageStub();
		markPwaPromptAfterLogin(storage);
		expect(shouldPromptAfterLogin(storage)).toBe(true);
		clearPwaPromptAfterLogin(storage);
		expect(shouldPromptAfterLogin(storage)).toBe(false);
	});

	it('masque la proposition pendant exactement sept jours', () => {
		const now = Date.UTC(2026, 9, 18);
		const storage = storageStub();
		snoozePwaInstall(now, storage);
		expect(
			isPwaInstallSnoozed(now + PWA_SNOOZE_DURATION_MS - 1, storage)
		).toBe(true);
		expect(
			isPwaInstallSnoozed(now + PWA_SNOOZE_DURATION_MS, storage)
		).toBe(false);
	});

	it('autorise uniquement un mobile non installé et non reporté', () => {
		const android = navigatorStub({ userAgent: 'Mozilla/5.0 Android 15' });
		const storage = storageStub();

		expect(
			canShowPwaInstallPrompt({
				navigatorValue: android,
				standaloneMediaQuery: false,
				storage,
			})
		).toBe(true);
		expect(
			canShowPwaInstallPrompt({
				navigatorValue: android,
				standaloneMediaQuery: true,
				storage,
			})
		).toBe(false);
		expect(
			canShowPwaInstallPrompt({
				navigatorValue: navigatorStub({ userAgent: 'Desktop' }),
				standaloneMediaQuery: false,
				storage,
			})
		).toBe(false);

		snoozePwaInstall(Date.now(), storage);
		expect(
			canShowPwaInstallPrompt({
				navigatorValue: android,
				standaloneMediaQuery: false,
				storage,
			})
		).toBe(false);
	});
});
