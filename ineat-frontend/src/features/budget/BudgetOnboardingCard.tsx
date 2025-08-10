import { FC, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import useBudgetStore from '@/stores/budgetStore';
import {
	PiggyBank,
	Target,
	Calendar,
	AlertTriangle,
	Loader2,
	PlusCircle,
} from 'lucide-react';

const BudgetOnboardingCard: FC = () => {
	const [amount, setAmount] = useState<string>('');
	const [isCreating, setIsCreating] = useState(false);
	const { createMonthlyBudget, error } = useBudgetStore();

	const handleCreateBudget = async () => {
		const budgetAmount = Number.parseFloat(amount);

		if (!budgetAmount || budgetAmount <= 0) {
			return;
		}

		if (isCreating) {
			return;
		}

		setIsCreating(true);
		try {
			await createMonthlyBudget(budgetAmount);
			setAmount('');
		} catch (error) {
			console.error('Erreur création budget:', error);
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<Card className='relative overflow-hidden border-0 bg-gradient-to-br from-white to-blue-50/50 shadow-xl hover:shadow-2xl transition-all duration-300'>
			{/* Effet de brillance en arrière-plan */}
			<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/30 to-purple-100/30 rounded-full blur-3xl -translate-y-16 translate-x-16' />

			<CardHeader className='pb-4'>
				<CardTitle className='flex items-center gap-3 text-gray-800'>
					<div className='p-2 rounded-xl bg-blue-50 border border-blue-200'>
						<PiggyBank className='size-5 text-blue-600' />
					</div>
					<span className='font-semibold'>Créer votre budget</span>
				</CardTitle>
			</CardHeader>

			<CardContent className='space-y-6'>
				<div className='text-center space-y-4'>
					<div className='relative'>
						<div className='size-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg'>
							<Target className='size-8 text-neutral-50' />
						</div>
					</div>
					<div className='space-y-2'>
						<h3 className='font-bold text-xl text-gray-900'>
							Définissez votre budget mensuel
						</h3>
						<p className='text-gray-600 leading-relaxed'>
							Suivez vos dépenses et maîtrisez votre budget
							alimentaire avec des insights intelligents
						</p>
					</div>
				</div>

				<div className='space-y-4'>
					<div className='space-y-3'>
						<label
							htmlFor='budget-amount'
							className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
							<Calendar className='size-4 text-blue-600' />
							Montant mensuel (€)
						</label>
						<div className='relative'>
							<Input
								id='budget-amount'
								type='number'
								placeholder='Ex: 300'
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								onKeyDown={(e) =>
									e.key === 'Enter' && handleCreateBudget()
								}
								min='1'
								step='1'
								disabled={isCreating}
								className='pl-8 h-12 text-lg font-semibold border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-all duration-300'
							/>
							<div className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold'>
								€
							</div>
						</div>
					</div>

					{error && (
						<Alert className='border-red-200 bg-red-50'>
							<AlertTriangle className='size-4 text-red-600' />
							<AlertDescription className='text-red-800 font-medium'>
								{error}
							</AlertDescription>
						</Alert>
					)}

					<Button
						onClick={handleCreateBudget}
						disabled={
							!amount ||
							Number.parseFloat(amount) <= 0 ||
							isCreating
						}
						className='w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-neutral-50 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'>
						{isCreating ? (
							<>
								<Loader2 className='size-5 mr-2 animate-spin' />
								Création en cours...
							</>
						) : (
							<>
								<PlusCircle className='size-5 mr-2' />
								Créer mon budget
							</>
						)}
					</Button>
				</div>

				<div className='bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4'>
					<div className='flex items-start gap-3'>
						<div className='flex-shrink-0 size-8 bg-blue-100 rounded-lg flex items-center justify-center'>
							<span className='text-lg'>💡</span>
						</div>
						<div className='flex-1'>
							<p className='text-sm font-medium text-gray-800 leading-relaxed'>
								Votre budget sera automatiquement reconduit
								chaque mois avec un suivi intelligent de vos
								habitudes
							</p>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

export default BudgetOnboardingCard;
