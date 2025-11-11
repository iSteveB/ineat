import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
	Loader2,
	CheckCircle2,
	XCircle,
	Clock,
	FileText,
	ShoppingCart,
	AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReceiptPolling } from '@/hooks/useReceiptPolling';
import { formatRemainingTime } from '@/utils/receiptUtils';
import type { ReceiptStatusData } from '@/services/receiptService';

// ===== TYPES =====

/**
 * Props du composant ReceiptProcessingLoader
 */
interface ReceiptProcessingLoaderProps {
	/**
	 * ID du ticket en cours de traitement
	 */
	receiptId: string;

	/**
	 * Callback appelé quand le traitement est terminé avec succès
	 */
	onCompleted?: (data: ReceiptStatusData) => void;

	/**
	 * Callback appelé en cas d'erreur
	 */
	onError?: (error: string) => void;

	/**
	 * Callback appelé quand l'utilisateur annule
	 */
	onCancel?: () => void;

	/**
	 * Titre du composant
	 */
	title?: string;

	/**
	 * Active le bouton d'annulation
	 */
	showCancelButton?: boolean;

	/**
	 * Classe CSS additionnelle
	 */
	className?: string;
}

/**
 * Étape de traitement avec métadonnées
 */
interface ProcessingStep {
	key: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	description: string;
	minProgress: number;
	maxProgress: number;
}

// ===== CONSTANTES =====

/**
 * Étapes du traitement
 */
const PROCESSING_STEPS: ProcessingStep[] = [
	{
		key: 'upload',
		label: 'Upload de l\'image',
		icon: FileText,
		description: 'Envoi de votre ticket vers nos serveurs',
		minProgress: 0,
		maxProgress: 20,
	},
	{
		key: 'ocr',
		label: 'Reconnaissance OCR',
		icon: Loader2,
		description: 'Analyse du texte et des produits',
		minProgress: 20,
		maxProgress: 60,
	},
	{
		key: 'matching',
		label: 'Correspondance produits',
		icon: ShoppingCart,
		description: 'Association avec la base de données',
		minProgress: 60,
		maxProgress: 90,
	},
	{
		key: 'validation',
		label: 'Finalisation',
		icon: CheckCircle2,
		description: 'Préparation des résultats',
		minProgress: 90,
		maxProgress: 100,
	},
];

// ===== COMPOSANT =====

/**
 * Composant d'affichage du statut de traitement d'un ticket
 * 
 * Fonctionnalités :
 * - Polling automatique du statut
 * - Barre de progression animée
 * - Affichage des étapes de traitement
 * - Temps restant estimé
 * - Gestion des erreurs
 * - Bouton d'annulation
 * 
 * @example
 * ```tsx
 * <ReceiptProcessingLoader
 *   receiptId="receipt-123"
 *   onCompleted={(data) => navigate(`/receipts/${data.id}/results`)}
 *   onError={(error) => toast.error(error)}
 * />
 * ```
 */
export const ReceiptProcessingLoader: React.FC<ReceiptProcessingLoaderProps> = ({
	receiptId,
	onCompleted,
	onError,
	onCancel,
	title = 'Traitement en cours',
	showCancelButton = true,
	className,
}) => {
	// ===== STATE =====

	const [currentStepIndex, setCurrentStepIndex] = useState(0);

	// ===== HOOKS =====

	const { status, isPolling, error } = useReceiptPolling({
		receiptId,
		onCompleted,
		onError: (err: Error) => onError?.(err.message),
		pollingInterval: 2000,
	});

	// ===== EFFETS =====

	/**
	 * Met à jour l'étape courante en fonction de la progression
	 */
	useEffect(() => {
		if (!status) return;

		const progress = status.validationProgress;

		// Trouver l'étape correspondante
		const stepIndex = PROCESSING_STEPS.findIndex(
			(step) => progress >= step.minProgress && progress < step.maxProgress
		);

		if (stepIndex !== -1) {
			setCurrentStepIndex(stepIndex);
		} else if (progress >= 100) {
			setCurrentStepIndex(PROCESSING_STEPS.length - 1);
		}
	}, [status]);

	// ===== CALCULS =====

	/**
	 * Calcule la progression réelle (0-100)
	 */
	const getProgress = (): number => {
		if (!status) return 0;

		// Utiliser la progression de validation si disponible
		if (status.validationProgress !== undefined) {
			return status.validationProgress;
		}

		// Sinon calculer basé sur les items validés
		if (status.totalItems > 0) {
			return Math.round((status.validatedItems / status.totalItems) * 100);
		}

		return 0;
	};

	const progress = getProgress();
	const currentStep = PROCESSING_STEPS[currentStepIndex];

	// ===== RENDU DES SECTIONS =====

	/**
	 * Rendu de l'en-tête avec statut
	 */
	const renderHeader = () => {
		const StatusIcon = status?.status === 'FAILED' ? XCircle : Loader2;
		const iconClassName = status?.status === 'FAILED' 
			? 'text-red-400' 
			: 'text-primary animate-spin';

		return (
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<StatusIcon className={cn('size-5', iconClassName)} />
					{title}
				</CardTitle>
				{status && (
					<p className="text-sm text-muted-foreground">
						{currentStep.description}
					</p>
				)}
			</CardHeader>
		);
	};

	/**
	 * Rendu de la barre de progression
	 */
	const renderProgress = () => {
		return (
			<div className="space-y-2">
				<div className="flex items-center justify-between text-sm">
					<span className="font-medium">{progress}%</span>
					{status?.estimatedTimeRemaining && (
						<span className="text-muted-foreground flex items-center gap-1">
							<Clock className="size-3" />
							{formatRemainingTime(status.estimatedTimeRemaining)}
						</span>
					)}
				</div>

				<Progress value={progress} className="h-2" />

				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<span>
						{status?.validatedItems || 0} / {status?.totalItems || 0} items
					</span>
					<span>{currentStep.label}</span>
				</div>
			</div>
		);
	};

	/**
	 * Rendu des étapes de traitement
	 */
	const renderSteps = () => {
		return (
			<div className="space-y-2">
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
							)}
						>
							<div
								className={cn(
									'flex items-center justify-center size-8 rounded-full',
									isCompleted && 'bg-green-500/10 text-green-600',
									isCurrent && 'bg-primary/10 text-primary',
									isPending && 'bg-muted text-muted-foreground'
								)}
							>
								{isCompleted ? (
									<CheckCircle2 className="size-4" />
								) : (
									<StepIcon
										className={cn(
											'size-4',
											isCurrent && 'animate-pulse'
										)}
									/>
								)}
							</div>

							<div className="flex-1 min-w-0">
								<p
									className={cn(
										'text-sm font-medium',
										isPending && 'text-muted-foreground'
									)}
								>
									{step.label}
								</p>
							</div>

							{isCurrent && isPolling && (
								<Loader2 className="size-4 animate-spin text-primary" />
							)}
						</div>
					);
				})}
			</div>
		);
	};

	/**
	 * Rendu des informations du ticket
	 */
	const renderReceiptInfo = () => {
		if (!status) return null;

		return (
			<div className="space-y-2 text-sm">
				{status.merchantName && (
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground">Magasin :</span>
						<span className="font-medium">{status.merchantName}</span>
					</div>
				)}

				{status.totalAmount !== null && status.totalAmount !== undefined && (
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground">Montant :</span>
						<span className="font-medium">
							{new Intl.NumberFormat('fr-FR', {
								style: 'currency',
								currency: 'EUR',
							}).format(status.totalAmount)}
						</span>
					</div>
				)}

				{status.purchaseDate && (
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground">Date :</span>
						<span className="font-medium">
							{new Date(status.purchaseDate).toLocaleDateString('fr-FR')}
						</span>
					</div>
				)}
			</div>
		);
	};

	/**
	 * Rendu de l'erreur
	 */
	const renderError = () => {
		if (!error && status?.status !== 'FAILED') return null;

		const errorMessage = status?.errorMessage || error?.message || 'Une erreur est survenue';

		return (
			<Alert variant="warning">
				<AlertTriangle className="size-4" />
				<AlertDescription>{errorMessage}</AlertDescription>
			</Alert>
		);
	};

	/**
	 * Rendu des actions
	 */
	const renderActions = () => {
		if (!showCancelButton || status?.status === 'FAILED') return null;

		return (
			<div className="flex justify-center">
				<Button
					variant="outline"
					size="sm"
					onClick={onCancel}
					disabled={!onCancel}
				>
					Annuler
				</Button>
			</div>
		);
	};

	// ===== RENDU PRINCIPAL =====

	return (
		<Card className={cn('w-full', className)}>
			{renderHeader()}

			<CardContent className="space-y-6">
				{renderError()}
				
				{status?.status !== 'FAILED' && (
					<>
						{renderProgress()}
						{renderSteps()}
						{renderReceiptInfo()}
						{renderActions()}
					</>
				)}

				{status?.status === 'FAILED' && onCancel && (
					<div className="flex justify-center gap-2">
						<Button variant="outline" onClick={onCancel}>
							Retour
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
};

export type { ReceiptProcessingLoaderProps };