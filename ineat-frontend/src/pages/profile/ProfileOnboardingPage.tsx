import { FormEvent, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { COMMON_ALLERGENS } from '@/constants/dietary';
import { PrimaryGoal } from '@/schemas';
import { userService } from '@/services/userService';
import { useAuthStore } from '@/stores/authStore';

const GOALS: Array<{ value: PrimaryGoal; label: string; description: string }> = [
	{ value: 'REDUCE_WASTE', label: 'Réduire le gaspillage', description: 'Consommer les produits qui arrivent bientôt à expiration.' },
	{ value: 'SAVE_MONEY', label: 'Économiser', description: 'Mieux suivre le budget et les dépenses alimentaires.' },
	{ value: 'EAT_BETTER', label: 'Mieux manger', description: 'Privilégier des propositions adaptées à mes préférences.' },
	{ value: 'FIND_MEAL_IDEAS', label: 'Trouver des idées', description: 'Transformer plus facilement mon inventaire en repas.' },
];

export default function ProfileOnboardingPage() {
	const user = useAuthStore((state) => state.user);
	const refreshProfile = useAuthStore((state) => state.getProfile);
	const navigate = useNavigate();
	const [defaultServings, setDefaultServings] = useState(user?.defaultServings ?? 4);
	const [allergens, setAllergens] = useState<string[]>(user?.preferences?.allergens ?? []);
	const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(user?.primaryGoal ?? null);
	const [isSaving, setIsSaving] = useState(false);

	const toggleAllergen = (allergen: string) => {
		setAllergens((current) =>
			current.includes(allergen)
				? current.filter((item) => item !== allergen)
				: [...current, allergen],
		);
	};

	const finish = async (saveAnswers: boolean) => {
		setIsSaving(true);
		try {
			if (saveAnswers) {
				await userService.updateDietaryRestrictions({ allergens });
			}
			await userService.updatePersonalInfo({
				...(saveAnswers ? { defaultServings, primaryGoal } : {}),
				completeProfileOnboarding: true,
			});
			await refreshProfile();
			toast.success(saveAnswers ? 'Votre profil est personnalisé.' : 'Vous pourrez personnaliser votre profil plus tard.');
			await navigate({ to: '/app', replace: true });
		} catch (error) {
			console.error('Impossible de terminer la personnalisation', error);
			toast.error('Impossible d’enregistrer votre profil. Réessayez.');
		} finally {
			setIsSaving(false);
		}
	};

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault();
		void finish(true);
	};

	return (
		<div className='mx-auto flex min-h-[calc(100vh-8rem)] max-w-4xl items-center px-4 py-8'>
			<Card className='w-full'>
				<CardHeader>
					<div className='mb-2 flex size-11 items-center justify-center rounded-full bg-success-50/15 text-success-700'>
						<Sparkles className='size-5' />
					</div>
					<CardTitle>Personnalisons votre expérience</CardTitle>
					<CardDescription>Trois réponses suffisent et restent modifiables dans vos paramètres.</CardDescription>
				</CardHeader>
				<CardContent>
					<form className='space-y-8' onSubmit={handleSubmit}>
						<section className='space-y-3'>
							<Label htmlFor='onboarding-servings'>Pour combien de personnes cuisinez-vous habituellement ?</Label>
							<Input id='onboarding-servings' type='number' min={1} max={20} value={defaultServings} onChange={(event) => setDefaultServings(Number(event.target.value))} className='max-w-32' required />
						</section>

						<section className='space-y-3'>
							<div>
								<p className='text-sm font-medium'>Avez-vous des allergies ou intolérances ?</p>
								<p className='text-sm text-neutral-500'>Sélectionnez « Aucune » pour vider la liste.</p>
							</div>
							<div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
								<label className='flex cursor-pointer items-center gap-2 rounded-md border p-3'>
									<input type='checkbox' checked={allergens.length === 0} onChange={() => setAllergens([])} />
									Aucune
								</label>
								{COMMON_ALLERGENS.map((allergen) => (
									<label key={allergen.id} className='flex cursor-pointer items-center gap-2 rounded-md border p-3'>
										<input type='checkbox' checked={allergens.includes(allergen.id)} onChange={() => toggleAllergen(allergen.id)} />
										{allergen.label}
									</label>
								))}
							</div>
							<div className='flex gap-2 rounded-md bg-warning-50/20 p-3 text-sm text-neutral-700'>
								<AlertTriangle className='mt-0.5 size-4 shrink-0' />
								<span>Les suggestions InEat ne remplacent jamais la vérification des ingrédients et des étiquettes.</span>
							</div>
						</section>

						<section className='space-y-3'>
							<p className='text-sm font-medium'>Quel est votre objectif principal ?</p>
							<div className='grid gap-3 sm:grid-cols-2'>
								{GOALS.map((goal) => (
									<button key={goal.value} type='button' aria-pressed={primaryGoal === goal.value} onClick={() => setPrimaryGoal(goal.value)} className={`rounded-lg border p-4 text-left transition ${primaryGoal === goal.value ? 'border-success-600 bg-success-50/10' : 'border-neutral-200 hover:border-success-300'}`}>
										<span className='block font-medium'>{goal.label}</span>
										<span className='mt-1 block text-sm text-neutral-500'>{goal.description}</span>
									</button>
								))}
							</div>
						</section>

						<div className='flex flex-col-reverse gap-3 sm:flex-row sm:justify-end'>
							<Button type='button' variant='ghost' disabled={isSaving} onClick={() => void finish(false)}>Plus tard</Button>
							<Button type='submit' disabled={isSaving || defaultServings < 1 || defaultServings > 20}>
								{isSaving && <Loader2 className='mr-2 size-4 animate-spin' />}
								Enregistrer et continuer
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
