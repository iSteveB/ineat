import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Download, Share, Smartphone, SquarePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	canShowPwaInstallPrompt,
	clearPwaPromptAfterLogin,
	hasNativeInstallPrompt,
	isAndroidDevice,
	isIosDevice,
	PWA_PROMPT_DELAY_MS,
	requestNativePwaInstall,
	shouldPromptAfterLogin,
	snoozePwaInstall,
	subscribeToNativeInstallPrompt,
} from '@/lib/pwa-install';

export function PwaInstallBottomSheet() {
	const [open, setOpen] = useState(false);
	const [nativePromptAvailable, setNativePromptAvailable] = useState(
		hasNativeInstallPrompt()
	);
	const [showIosInstructions, setShowIosInstructions] = useState(false);

	const ios = isIosDevice();
	const android = isAndroidDevice();

	useEffect(() => subscribeToNativeInstallPrompt(setNativePromptAvailable), []);

	useEffect(() => {
		if (!shouldPromptAfterLogin()) return;

		const timeout = window.setTimeout(() => {
			if (!canShowPwaInstallPrompt()) {
				clearPwaPromptAfterLogin();
				return;
			}

			// Chrome can emit beforeinstallprompt shortly after the authenticated
			// layout mounts. Keep the session signal until that event is available.
			if (android && !hasNativeInstallPrompt()) return;

			clearPwaPromptAfterLogin();
			setOpen(true);
		}, PWA_PROMPT_DELAY_MS);

		return () => window.clearTimeout(timeout);
	}, [android, nativePromptAvailable]);

	const postpone = () => {
		snoozePwaInstall();
		setOpen(false);
	};

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen && open) postpone();
		else setOpen(nextOpen);
	};

	const install = async () => {
		if (ios) {
			setShowIosInstructions(true);
			return;
		}

		const outcome = await requestNativePwaInstall();
		if (outcome !== 'unavailable') setOpen(false);
	};

	return (
		<DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay className='fixed inset-0 z-50 bg-neutral-950/45 data-[state=closed]:animate-fade data-[state=open]:animate-fade' />
				<DialogPrimitive.Content
					className='fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg rounded-t-2xl bg-surface px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-xl outline-none data-[state=open]:animate-slide'
					aria-describedby='pwa-install-description'>
					<div className='mx-auto mb-5 h-1 w-10 rounded-full bg-neutral-100/40' />

					<DialogPrimitive.Close
						className='absolute right-4 top-4 rounded-full p-2 text-neutral-600 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600'
						aria-label='Fermer'>
						<X className='size-5' />
					</DialogPrimitive.Close>

					<div className='mb-4 flex size-12 items-center justify-center rounded-full bg-brand-300/35 text-neutral-900'>
						{showIosInstructions ? (
							<Share className='size-6' />
						) : (
							<Smartphone className='size-6' />
						)}
					</div>

					<DialogPrimitive.Title className='pr-10 type-h2 text-neutral-900'>
						{showIosInstructions
							? 'Ajouter INEAT sur iPhone'
							: 'Installer INEAT'}
					</DialogPrimitive.Title>

					<DialogPrimitive.Description
						id='pwa-install-description'
						className='mt-2 text-sm leading-relaxed text-neutral-600'>
						{showIosInstructions
							? "Dans Safari, utilisez le menu de partage pour installer l’application."
							: "Ajouter l’application à votre écran d’accueil"}
					</DialogPrimitive.Description>

					{showIosInstructions && (
						<ol className='mt-5 space-y-4 text-sm text-neutral-900'>
							<li className='flex items-center gap-3'>
								<span className='flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-300/35'>
									<Share className='size-4' aria-hidden='true' />
								</span>
								<span>Touchez <strong>Partager</strong> dans Safari.</span>
							</li>
							<li className='flex items-center gap-3'>
								<span className='flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-300/35'>
									<SquarePlus className='size-4' aria-hidden='true' />
								</span>
								<span>Sélectionnez <strong>Sur l’écran d’accueil</strong>.</span>
							</li>
						</ol>
					)}

					<div className='mt-6 grid gap-3'>
						{showIosInstructions ? (
							<Button fullWidth onClick={postpone}>
								J’ai compris
							</Button>
						) : (
							<Button
								fullWidth
								onClick={install}
								disabled={android && !nativePromptAvailable}>
								<Download aria-hidden='true' />
								Ajouter
							</Button>
						)}
						<Button fullWidth variant='ghost' onClick={postpone}>
							Plus tard
						</Button>
					</div>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
