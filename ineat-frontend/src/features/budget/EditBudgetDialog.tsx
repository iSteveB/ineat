import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Budget, UpdateBudgetData } from "@/schemas";
import { isValidBudget } from "@/schemas/budget";
import { budgetService } from "@/services/budgetService";
import useBudgetStore from "@/stores/budgetStore";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Edit, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { FC, useState, useMemo } from "react";

interface EditBudgetDialogProps {
	budget: Budget;
	onBudgetUpdated: () => void;
}

const EditBudgetDialog: FC<EditBudgetDialogProps> = ({
	budget,
	onBudgetUpdated,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [amount, setAmount] = useState<string>(budget.amount.toString());
	const [isUpdating, setIsUpdating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { updateBudget } = useBudgetStore();

	const safeBudgetPeriod = useMemo(() => {
		if (!budget || !isValidBudget(budget)) {
			return 'Période non définie';
		}

		try {
			return budgetService.formatBudgetPeriod(budget);
		} catch {
			return 'Erreur de formatage';
		}
	}, [budget]);

	const handleUpdateBudget = async () => {
		const budgetAmount = parseFloat(amount);

		if (!budgetAmount || budgetAmount <= 0) {
			setError('Veuillez saisir un montant valide');
			return;
		}

		if (budgetAmount === budget.amount) {
			setError('Le montant est identique au montant actuel');
			return;
		}

		setIsUpdating(true);
		setError(null);

		try {
			const updateData: UpdateBudgetData = {
				amount: budgetAmount,
			};

			await updateBudget(budget.id, updateData);
			setIsOpen(false);
			onBudgetUpdated();
		} catch {
			setError('Erreur lors de la modification du budget');
		} finally {
			setIsUpdating(false);
		}
	};

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (!open) {
			setAmount(budget.amount.toString());
			setError(null);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant='secondary' size='sm'>
					<Edit className='size-4 mr-1' />
					Modifier le budget
				</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<Edit className='size-5 text-accent' />
						Modifier le budget
					</DialogTitle>
					<DialogDescription>
						Modifiez le montant de votre budget mensuel pour{' '}
						{safeBudgetPeriod}
					</DialogDescription>
				</DialogHeader>

				<div className='space-y-4'>
					<Alert className='border-success-50/20 bg-success-50/10'>
						<CheckCircle className='size-4 text-success-50' />
						<AlertDescription className='text-neutral-300'>
							<span className="font-bold">À savoir :</span> Cette
							action modifie uniquement le montant de votre
							budget. Toutes vos dépenses existantes sont conservées.
						</AlertDescription>
					</Alert>

					<div className='space-y-2'>
						<label
							htmlFor='edit-budget-amount'
							className='text-sm font-medium'>
							Nouveau montant (€)
						</label>
						<Input
							id='edit-budget-amount'
							type='number'
							placeholder='Ex: 350'
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							min='1'
							step='1'
							disabled={isUpdating}
						/>
					</div>

					{error && (
						<Alert variant='warning'>
							<AlertTriangle className='size-4' />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<div className='bg-neutral-100 p-3 rounded-md'>
						<div className='flex justify-between text-sm'>
							<span>Montant actuel :</span>
							<span className='font-semibold'>
								{budgetService.formatCurrency(budget.amount)}
							</span>
						</div>
						{parseFloat(amount) > 0 &&
							parseFloat(amount) !== budget.amount && (
								<div className='flex justify-between text-sm mt-1'>
									<span>Nouveau montant :</span>
									<span className='font-semibold text-accent'>
										{budgetService.formatCurrency(
											parseFloat(amount)
										)}
									</span>
								</div>
							)}
					</div>
				</div>

				<DialogFooter>
					<Button
						variant='outline'
						onClick={() => setIsOpen(false)}
						disabled={isUpdating}>
						Annuler
					</Button>
					<Button
						onClick={handleUpdateBudget}
						disabled={
							!amount ||
							parseFloat(amount) <= 0 ||
							isUpdating ||
							parseFloat(amount) === budget.amount
						}>
						{isUpdating ? (
							<>
								<Loader2 className='size-4 mr-2 animate-spin' />
								Modification...
							</>
						) : (
							<>
								<Edit className='size-4 mr-2' />
								Modifier
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default EditBudgetDialog;