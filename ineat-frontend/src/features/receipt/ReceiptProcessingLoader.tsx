import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
	Loader2,
	CheckCircle2,
	FileText,
	Search,
	AlertTriangle,
	Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Props du composant
 */
interface ReceiptProcessingLoaderProps {
	receiptId: string;
	onCancel: () => void;
	title?: string;
}

/**
 * Étape de traitement
 */
interface ProcessingStep {
	key: 'upload' | 'ocr' | 'llm' | 'done';
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	description: string;
	minProgress: number;
	maxProgress: number;
}

/**
 * Étapes du traitement Tesseract + LLM
 */
const PROCESSING_STEPS: ProcessingStep[] = [
	{
		key: 'upload',
		label: 'Upload',
		icon: FileText,
		description: 'Envoi de votre ticket vers nos serveurs',
		minProgress: 0,
		maxProgress: 20,
	},
	{
		key: 'ocr',
		label: 'Extraction du texte',
		icon: FileText,
		description: 'Lecture du ticket par OCR (Tesseract)',
		minProgress: 20,
		maxProgress: 50,
	},
	{
		key: 'llm',
		label: 'Analyse des produits',
		icon: Search,
		description: 'Identification et vérification des codes EAN',
		minProgress: 50,
		maxProgress: 90,
	},
	{
		key: 'done',
		label: 'Finalisation',
		icon: CheckCircle2,
		description: 'Préparation des résultats',
		minProgress: 90,
		maxProgress: 100,
	},
];

/**
 * Composant de chargement pendant le traitement du ticket
 *
 * Affiche une barre de progression animée avec les étapes :
 * 1. Upload de l'image
 * 2. OCR (Tesseract)
 * 3. Analyse LLM (OpenAI avec internet)
 * 4. Finalisation
 *
 * Note : Le polling est géré par le store, ce composant affiche juste l'état
 */
export const ReceiptProcessingLoader = ({
	onCancel,
	title = 'Analyse en cours',
}: ReceiptProcessingLoaderProps) => {
	// ===== STATE =====
	const [progress, setProgress] = useState(0);
	const [currentStepIndex, setCurrentStepIndex] = useState(0);
	const [elapsedTime, setElapsedTime] = useState(0);

	// ===== EFFETS =====

	/**
	 * Simule la progression pendant l'analyse
	 * (En attendant les vraies données du backend)
	 */
	useEffect(() => {
		const interval = setInterval(() => {
			setProgress((prev) => {
				// Progression plus lente vers la fin
				if (prev >= 90) return Math.min(prev + 0.5, 95);
				if (prev >= 70) return prev + 1;
				return prev + 2;
			});
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	/**
	 * Met à jour l'étape courante selon la progression
	 */
	useEffect(() => {
		const stepIndex = PROCESSING_STEPS.findIndex(
			(step) =>
				progress >= step.minProgress && progress < step.maxProgress
		);

		if (stepIndex !== -1) {
			setCurrentStepIndex(stepIndex);
		} else if (progress >= 100) {
			setCurrentStepIndex(PROCESSING_STEPS.length - 1);
		}
	}, [progress]);

	/**
	 * Compteur de temps écoulé
	 */
	useEffect(() => {
		const interval = setInterval(() => {
			setElapsedTime((prev) => prev + 1);
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	// ===== HELPERS =====

	const formatElapsedTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	const currentStep = PROCESSING_STEPS[currentStepIndex];

	// ===== RENDU =====

	return (
		<Card className='w-full'>
			<CardHeader>
				<CardTitle className='flex items-center gap-2'>
					<Loader2 className='size-5 text-primary animate-spin' />
					{title}
				</CardTitle>
				<p className='text-sm text-muted-foreground'>
					{currentStep.description}
				</p>
			</CardHeader>

			<CardContent className='space-y-6'>
				{/* Barre de progression */}
				<div className='space-y-2'>
					<div className='flex items-center justify-between text-sm'>
						<span className='font-medium'>
							{Math.round(progress)}%
						</span>
						<span className='text-muted-foreground flex items-center gap-1'>
							<Clock className='size-3' />
							{formatElapsedTime(elapsedTime)}
						</span>
					</div>

					<Progress value={progress} className='h-2' />

					<div className='flex items-center justify-end text-xs text-muted-foreground'>
						<span>{currentStep.label}</span>
					</div>
				</div>

				{/* Étapes */}
				<div className='space-y-2'>
					{PROCESSING_STEPS.map((step, index) => {
						const StepIcon = step.icon;
						const isCompleted = index < currentStepIndex;
						const isCurrent = index === currentStepIndex;
						const isPending = index > currentStepIndex;

						return (
							<div
								key={step.key}
								className={cn(
									'flex items-center gap-3 p-2 rounded-lg transition-colors',
									isCurrent && 'bg-primary/5',
									isCompleted && 'opacity-50'
								)}>
								<div
									className={cn(
										'flex items-center justify-center size-8 rounded-full',
										isCompleted &&
											'bg-green-500/10 text-green-600',
										isCurrent &&
											'bg-primary/10 text-primary',
										isPending &&
											'bg-muted text-muted-foreground'
									)}>
									{isCompleted ? (
										<CheckCircle2 className='size-4' />
									) : (
										<StepIcon
											className={cn(
												'size-4',
												isCurrent && 'animate-pulse'
											)}
										/>
									)}
								</div>

								<div className='flex-1 min-w-0'>
									<p
										className={cn(
											'text-sm font-medium',
											isPending && 'text-muted-foreground'
										)}>
										{step.label}
									</p>
									{isCurrent && (
										<p className='text-xs text-muted-foreground'>
											{step.description}
										</p>
									)}
								</div>

								{isCurrent && (
									<Loader2 className='size-4 animate-spin text-primary' />
								)}
							</div>
						);
					})}
				</div>

				{/* Conseil patience */}
				<Alert>
					<AlertTriangle className='size-4' />
					<AlertDescription>
						L'analyse peut prendre 15 à 30 secondes. Merci de
						patienter.
					</AlertDescription>
				</Alert>

				{/* Bouton annuler */}
				<div className='flex justify-center'>
					<Button variant='outline' size='sm' onClick={onCancel}>
						Annuler
					</Button>
				</div>
			</CardContent>
		</Card>
	);
};

export type { ReceiptProcessingLoaderProps };
