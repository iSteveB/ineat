import React from 'react';
import { Link, useMatches } from '@tanstack/react-router';
import { ArrowLeft, Home, SearchX } from 'lucide-react';

import logoMark from '@/assets/Logo.svg';
import { Button } from '@/components/ui/button';

interface Error404Props {
	/** Message d'erreur personnalisé */
	message?: string;
}

/**
 * Page introuvable. Sous /app, elle s'affiche dans la mise en page de l'application
 * (qui porte déjà le <main>) ; ailleurs, elle porte son propre <main> et le logo.
 */
export const Error404Page: React.FC<Error404Props> = ({
	message = 'Cette page n’existe pas ou a été déplacée.',
}) => {
	const isInApp = useMatches({
		select: (matches) => matches.some((match) => match.routeId.startsWith('/app')),
	});

	const content = (
		<div className='mx-auto flex w-full max-w-md flex-col items-center gap-5 px-4 py-12 text-center'>
			<span className='flex size-24 items-center justify-center rounded-full bg-brand-100 text-brand-800'>
				<SearchX className='size-12' aria-hidden='true' />
			</span>
			<div className='flex flex-col gap-2'>
				<p className='text-sm font-semibold uppercase tracking-wide text-accent-700'>
					Erreur 404
				</p>
				<h1 className='type-h1 text-neutral-900'>Page introuvable</h1>
				<p className='text-neutral-600'>{message}</p>
			</div>
			<div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row'>
				<Button asChild>
					<Link to={isInApp ? '/app' : '/'}>
						<Home aria-hidden='true' />
						{isInApp ? 'Retour à l’accueil' : 'Retour au site'}
					</Link>
				</Button>
				<Button variant='secondary' onClick={() => window.history.back()}>
					<ArrowLeft aria-hidden='true' />
					Page précédente
				</Button>
			</div>
		</div>
	);

	if (isInApp) return content;

	return (
		<div className='flex min-h-screen flex-col bg-canvas'>
			<header className='px-4 py-4 sm:px-6'>
				<Link to='/' className='inline-flex items-center gap-2 rounded-md text-neutral-900'>
					<img src={logoMark} alt='' className='size-9' />
					<span className='font-display text-xl font-bold tracking-tight'>InEat</span>
				</Link>
			</header>
			<main id='contenu' className='flex flex-1 items-center justify-center'>
				{content}
			</main>
		</div>
	);
};
