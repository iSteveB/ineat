import { FormEvent, useState } from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, Lightbulb, Mail, Send } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import {
	SUPPORT_SUBJECTS,
	supportService,
	type SupportSubject,
} from '@/services/supportService';
import { ApiRequestError } from '@/lib/api-client';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const FAQ_SECTIONS = [
	{
		title: 'Compte et sécurité',
		items: [
			{
				question: 'Comment modifier mes informations personnelles ?',
				answer:
					'Depuis Paramètres, ouvrez Informations personnelles pour modifier votre nom, votre adresse e-mail et vos préférences principales.',
			},
			{
				question: 'Comment changer mon mot de passe ?',
				answer:
					'Rendez-vous dans Paramètres, puis Sécurité. Votre mot de passe actuel sera demandé avant de définir le nouveau.',
			},
			{
				question: 'Puis-je supprimer mon compte ?',
				answer:
					'Oui. La suppression définitive est disponible dans les paramètres du compte. Lisez attentivement la confirmation, car cette action est irréversible.',
			},
		],
	},
	{
		title: 'Inventaire',
		items: [
			{
				question: 'Comment ajouter un produit à mon inventaire ?',
				answer:
					'Utilisez le bouton + de la navigation. Vous pouvez ensuite choisir la méthode proposée : ajout manuel, recherche, scan ou import de justificatif.',
			},
			{
				question: "Comment modifier un produit ou sa date d'expiration ?",
				answer:
					'Ouvrez le produit depuis votre inventaire pour consulter ses détails et modifier les informations disponibles.',
			},
			{
				question: "Comment fonctionnent les alertes d'expiration ?",
				answer:
					'InEat utilise les dates enregistrées dans votre inventaire pour identifier les produits expirés ou à consommer bientôt. Les préférences de notification se règlent dans Paramètres.',
			},
		],
	},
	{
		title: 'Recettes et abonnement',
		items: [
			{
				question: 'Comment obtenir des idées de recettes ?',
				answer:
					'Ouvrez Recettes pour parcourir vos recettes et accéder aux suggestions basées sur les informations disponibles dans InEat.',
			},
			{
				question: 'Où gérer mon abonnement ?',
				answer:
					'La section Abonnement des paramètres permet de consulter votre offre et, si nécessaire, d’accéder au portail de facturation sécurisé.',
			},
		],
	},
];

export default function HelpPage() {
	const user = useAuthStore((state) => state.user);
	const [subject, setSubject] = useState<SupportSubject>('ACCOUNT');
	const [message, setMessage] = useState('');
	const [isSending, setIsSending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const trimmedMessage = message.trim();
	const messageError =
		trimmedMessage.length > 0 && trimmedMessage.length < 10
			? 'Votre message doit contenir au moins 10 caractères.'
			: null;
	const placeholder =
		subject === 'FEATURE_REQUEST'
			? 'Décrivez votre idée et le problème qu’elle vous aiderait à résoudre.'
			: 'Expliquez votre demande avec le plus de détails possible.';

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError(null);
		setSuccess(false);

		if (trimmedMessage.length < 10 || trimmedMessage.length > 2000) {
			setError('Votre message doit contenir entre 10 et 2 000 caractères.');
			return;
		}

		try {
			setIsSending(true);
			await supportService.sendMessage(subject, trimmedMessage);
			setMessage('');
			setSuccess(true);
		} catch (caughtError) {
			setError(
				caughtError instanceof ApiRequestError
					? caughtError.message
					: "Votre message n'a pas pu être envoyé. Veuillez réessayer."
			);
		} finally {
			setIsSending(false);
		}
	};

	return (
		<div className='mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-4 sm:px-6 lg:py-6'>
			<header>
				<h1 className='type-h1 text-neutral-900'>Aide</h1>
				<p className='text-neutral-600'>
					Les réponses aux questions courantes, et l’équipe InEat si besoin.
				</p>
			</header>

			<section aria-labelledby='faq-title' className='flex flex-col gap-4'>
				<div className='flex items-center gap-3'>
					<span className='flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-50 text-accent-800'>
						<HelpCircle aria-hidden='true' className='size-5' />
					</span>
					<h2 id='faq-title' className='type-h2 text-neutral-900'>
						Questions fréquentes
					</h2>
				</div>

				<div className='grid items-start gap-4 md:grid-cols-2'>
					{FAQ_SECTIONS.map((section) => (
						<section
							key={section.title}
							aria-label={section.title}
							className='card p-4 sm:p-5'>
							<h3 className='type-h3 text-neutral-900'>{section.title}</h3>
							<Accordion type='single' collapsible>
								{section.items.map((item) => (
									<AccordionItem key={item.question} value={item.question}>
										<AccordionTrigger className='text-base'>{item.question}</AccordionTrigger>
										<AccordionContent className='leading-6 text-neutral-700'>
											{item.answer}
										</AccordionContent>
									</AccordionItem>
								))}
							</Accordion>
						</section>
					))}
				</div>
			</section>

			<section aria-labelledby='contact-title' className='card flex flex-col gap-5 p-4 sm:p-6'>
				<div className='flex items-start gap-3'>
					<span className='flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-100 text-brand-800'>
						<Lightbulb aria-hidden='true' className='size-5' />
					</span>
					<div>
						<h2 id='contact-title' className='type-h2 text-neutral-900'>
							Une question ou une idée ?
						</h2>
						<p className='text-sm text-neutral-600'>
							Votre message est envoyé directement à l’équipe InEat.
						</p>
					</div>
				</div>

				<form className='flex flex-col gap-5' onSubmit={handleSubmit} noValidate>
					<div className='grid gap-5 sm:grid-cols-2'>
						<div className='flex flex-col gap-2'>
							<Label htmlFor='support-email'>Votre adresse e-mail</Label>
							<div className='relative'>
								<Mail
									aria-hidden='true'
									className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-600'
								/>
								<input
									id='support-email'
									type='email'
									value={user?.email ?? ''}
									readOnly
									aria-describedby='support-email-hint'
									className='h-11 w-full rounded-md border border-neutral-200 bg-neutral-50 pl-10 pr-3 text-neutral-900'
								/>
							</div>
							<p id='support-email-hint' className='text-xs text-neutral-600'>
								Nous répondrons à cette adresse.
							</p>
						</div>

						<div className='flex flex-col gap-2'>
							<Label htmlFor='support-subject'>Sujet</Label>
							<select
								id='support-subject'
								value={subject}
								onChange={(event) => setSubject(event.target.value as SupportSubject)}
								className='h-11 w-full rounded-md border border-input bg-surface px-3 text-neutral-900'>
								{Object.entries(SUPPORT_SUBJECTS).map(([value, label]) => (
									<option key={value} value={value}>
										{label}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className='flex flex-col gap-2'>
						<div className='flex items-center justify-between gap-4'>
							<Label htmlFor='support-message'>Message</Label>
							<span className='text-xs text-neutral-600'>{message.length}/2 000</span>
						</div>
						<Textarea
							id='support-message'
							value={message}
							onChange={(event) => {
								setMessage(event.target.value);
								setError(null);
								setSuccess(false);
							}}
							placeholder={placeholder}
							maxLength={2000}
							rows={7}
							aria-describedby={messageError ? 'support-message-error' : undefined}
							aria-invalid={Boolean(messageError)}
						/>
						{messageError && (
							<p id='support-message-error' className='text-sm text-danger-700'>
								{messageError}
							</p>
						)}
					</div>

					{success && (
						<Alert variant='success' role='status'>
							<CheckCircle2 aria-hidden='true' />
							<AlertTitle>Message envoyé</AlertTitle>
							<AlertDescription>Votre message a bien été transmis au support.</AlertDescription>
						</Alert>
					)}
					{error && (
						<Alert variant='error'>
							<AlertTriangle aria-hidden='true' />
							<AlertTitle>Envoi impossible</AlertTitle>
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<Button
						type='submit'
						disabled={isSending || trimmedMessage.length < 10}
						className='w-full sm:w-auto sm:self-start'>
						<Send aria-hidden='true' />
						{isSending ? 'Envoi en cours…' : 'Envoyer le message'}
					</Button>
				</form>
			</section>
		</div>
	);
}
