import { FormEvent, useState } from 'react';
import { CheckCircle2, HelpCircle, Lightbulb, Mail, Send } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
		<div className='mx-auto w-full max-w-4xl space-y-8 px-4 py-6 sm:px-6 lg:py-10'>
			<section aria-labelledby='faq-title'>
				<div className='mb-5 flex items-start gap-3'>
					<div className='rounded-xl bg-primary-100/10 p-3 text-primary-100'>
						<HelpCircle aria-hidden='true' className='size-6' />
					</div>
					<div>
						<h2 id='faq-title' className='text-2xl font-semibold text-text-primary'>
							Questions fréquentes
						</h2>
						<p className='mt-1 text-sm text-neutral-200'>
							Retrouvez rapidement les réponses aux questions les plus courantes.
						</p>
					</div>
				</div>

				<div className='grid gap-4 md:grid-cols-2'>
					{FAQ_SECTIONS.map((section) => (
						<Card key={section.title} className='h-fit'>
							<CardHeader>
								<CardTitle className='text-lg'>{section.title}</CardTitle>
							</CardHeader>
							<CardContent>
								<Accordion type='single' collapsible>
									{section.items.map((item) => (
										<AccordionItem key={item.question} value={item.question}>
											<AccordionTrigger>{item.question}</AccordionTrigger>
											<AccordionContent className='leading-6 text-neutral-200'>
												{item.answer}
											</AccordionContent>
										</AccordionItem>
									))}
								</Accordion>
							</CardContent>
						</Card>
					))}
				</div>
			</section>

			<section aria-labelledby='contact-title'>
				<Card>
					<CardHeader>
						<div className='flex items-start gap-3'>
							<div className='rounded-xl bg-success-50/10 p-3 text-success-100'>
								<Lightbulb aria-hidden='true' className='size-6' />
							</div>
							<div>
								<CardTitle id='contact-title'>Une question ou une idée ?</CardTitle>
								<p className='mt-1 text-sm text-neutral-200'>
									Votre message sera envoyé directement à l’équipe InEat.
								</p>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<form className='space-y-5' onSubmit={handleSubmit} noValidate>
							<div className='space-y-2'>
								<Label htmlFor='support-email'>Votre adresse e-mail</Label>
								<div className='relative'>
									<Mail aria-hidden='true' className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-200' />
									<input
										id='support-email'
										type='email'
										value={user?.email ?? ''}
										readOnly
										className='h-10 w-full rounded-md border border-neutral-200 bg-neutral-100/40 pl-10 pr-3 text-sm text-neutral-300'
									/>
								</div>
								<p className='text-xs text-neutral-200'>Nous répondrons à cette adresse.</p>
							</div>

							<div className='space-y-2'>
								<Label htmlFor='support-subject'>Sujet</Label>
								<select
									id='support-subject'
									value={subject}
									onChange={(event) => setSubject(event.target.value as SupportSubject)}
									className='h-10 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-100'>
									{Object.entries(SUPPORT_SUBJECTS).map(([value, label]) => (
										<option key={value} value={value}>{label}</option>
									))}
								</select>
							</div>

							<div className='space-y-2'>
								<div className='flex items-center justify-between gap-4'>
									<Label htmlFor='support-message'>Message</Label>
									<span className='text-xs text-neutral-200'>{message.length}/2 000</span>
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
									<p id='support-message-error' className='text-sm text-error-100'>{messageError}</p>
								)}
							</div>

							{success && (
								<Alert variant='success' aria-live='polite'>
									<CheckCircle2 aria-hidden='true' />
									<AlertTitle>Message envoyé</AlertTitle>
									<AlertDescription>Votre message a bien été transmis au support.</AlertDescription>
								</Alert>
							)}
							{error && (
								<Alert variant='error' aria-live='assertive'>
									<AlertTitle>Envoi impossible</AlertTitle>
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

							<Button type='submit' disabled={isSending || trimmedMessage.length < 10} className='w-full sm:w-auto'>
								<Send aria-hidden='true' className='size-4' />
								{isSending ? 'Envoi en cours…' : 'Envoyer le message'}
							</Button>
						</form>
					</CardContent>
				</Card>
			</section>
		</div>
	);
}
