import { useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ReceiptSummary } from '@/features/receipt/ReceiptSummary';
import { ProductCardConfident } from '@/features/receipt/ProductCardConfident';
import { Phase1Actions } from '@/features/receipt/Phase1Actions';
import {
	useReceiptStore,
	receiptSelectors,
	useScanStatistics,
} from '@/stores/receiptStore';

/**
 * Page des résultats d'un ticket scanné
 *
 * Workflow :
 * 1. Affiche Phase 1 (produits bien identifiés)
 * 2. User valide/ignore chaque produit
 * 3. Passe à Phase 2 (produits problématiques)
 * 4. User gère les cas difficiles
 * 5. Ajout à l'inventaire
 */
export const ReceiptResultsPage = () => {
	// ===== HOOKS =====
	const navigate = useNavigate();
	const { receiptId } = useParams({ strict: false }) as { receiptId: string };

	// ===== STORE =====
	const status = useReceiptStore(receiptSelectors.status);
	const analysis = useReceiptStore(receiptSelectors.analysis);
	const error = useReceiptStore(receiptSelectors.error);
	const currentPhase = useReceiptStore(receiptSelectors.currentPhase);
	const phase1Products = useReceiptStore(receiptSelectors.phase1Products);
	const phase2Products = useReceiptStore(receiptSelectors.phase2Products);
	const isPhase1Complete = useReceiptStore(receiptSelectors.isPhase1Complete);
	const canAddToInventory = useReceiptStore(
		receiptSelectors.canAddToInventory
	);

	const selectEan = useReceiptStore((s) => s.selectEan);
	const skipProduct = useReceiptStore((s) => s.skipProduct);
	const validatePhase1 = useReceiptStore((s) => s.validatePhase1);
	const goToPhase2 = useReceiptStore((s) => s.goToPhase2);
	const addToInventory = useReceiptStore((s) => s.addToInventory);
	const reset = useReceiptStore((s) => s.reset);

	const stats = useScanStatistics();

	// ===== EFFETS =====

	/**
	 * Vérifier qu'on a bien des résultats
	 */
	useEffect(() => {
		if (status !== 'results' || !analysis) {
			// Pas de résultats, retour à l'inventaire
			navigate({ to: '/app/inventory' });
		}
	}, [status, analysis, navigate]);

	/**
	 * Vérifier que le receiptId correspond
	 */
	useEffect(() => {
		if (analysis && analysis.receiptId !== receiptId) {
			navigate({ to: '/app/inventory' });
		}
	}, [analysis, receiptId, navigate]);

	/**
	 * Cleanup au démontage
	 */
	useEffect(() => {
		return () => {
			// Ne pas reset si on est juste en train de naviguer entre phases
			// Le reset se fait après addToInventory() ou annulation explicite
		};
	}, []);

	// ===== HANDLERS =====

	/**
	 * Sélectionne un code EAN pour un produit
	 */
	const handleSelectEan = (productId: string, eanCode: string) => {
		selectEan(productId, eanCode);
	};

	/**
	 * Ignore un produit
	 */
	const handleSkipProduct = (productId: string) => {
		skipProduct(productId);
	};

	/**
	 * Valide Phase 1 et passe à Phase 2
	 */
	const handleValidatePhase1 = () => {
		try {
			validatePhase1();

			if (phase2Products.length === 0) {
				// Pas de Phase 2, on peut ajouter directement
				toast.info('Tous les produits sont validés !');
			} else {
				toast.success(
					`Phase 1 terminée ! ${phase2Products.length} produits nécessitent votre attention.`
				);
			}
		} catch (err) {
			if (err instanceof Error) {
				toast.error(err.message);
			}
		}
	};

	/**
	 * Passe directement à Phase 2 (si l'user veut)
	 */
	const handleGoToPhase2 = () => {
		goToPhase2();
	};

	/**
	 * Ajoute tous les produits validés à l'inventaire
	 */
	const handleAddToInventory = async () => {
		try {
			await addToInventory();
			toast.success("Produits ajoutés à l'inventaire avec succès !");

			// Redirection après succès
			setTimeout(() => {
				navigate({ to: '/app/inventory' });
			}, 1500);
		} catch (err) {
			if (err instanceof Error) {
				toast.error(err.message);
			}
		}
	};

	/**
	 * Annule et retourne à l'inventaire
	 */
	const handleCancel = () => {
		reset();
		navigate({ to: '/app/inventory' });
	};

	// ===== RENDU DES SECTIONS =====

	/**
	 * En-tête avec navigation
	 */
	const renderHeader = () => (
		<div className='flex items-center justify-between mb-6'>
			<div className='flex items-center gap-3'>
				<Button
					variant='ghost'
					size='sm'
					onClick={handleCancel}
					className='p-2'>
					<ArrowLeft className='size-4' />
				</Button>
				<div>
					<h1 className='text-2xl font-bold'>
						{currentPhase === 1
							? 'Phase 1 : Validation'
							: 'Phase 2 : Problèmes'}
					</h1>
					<p className='text-sm text-muted-foreground'>
						{currentPhase === 1
							? 'Sélectionnez le bon code EAN pour chaque produit'
							: 'Gérez les produits difficiles à identifier'}
					</p>
				</div>
			</div>
		</div>
	);

	/**
	 * Rendu de Phase 1
	 */
	const renderPhase1 = () => {
		if (!analysis) return null;

		return (
			<div className='space-y-6'>
				{/* Résumé du ticket */}
				<ReceiptSummary analysis={analysis} />

				{/* Message d'encouragement */}
				{phase1Products.length > 0 && (
					<Alert>
						<CheckCircle2 className='size-4' />
						<AlertDescription>
							<strong>
								{phase1Products.length} produits bien identifiés
							</strong>{' '}
							avec des suggestions de codes EAN. Sélectionnez le
							bon code pour chaque produit.
						</AlertDescription>
					</Alert>
				)}

				{/* Liste des produits Phase 1 */}
				<div className='space-y-4'>
					{phase1Products.map((product) => (
						<ProductCardConfident
							key={product.id}
							product={product}
							onSelectEan={(ean) =>
								handleSelectEan(product.id, ean)
							}
							onSkip={() => handleSkipProduct(product.id)}
						/>
					))}
				</div>

				{/* Actions Phase 1 */}
				<Phase1Actions
					totalProducts={phase1Products.length}
					validatedCount={stats.validatedCount}
					isComplete={isPhase1Complete}
					hasPhase2={phase2Products.length > 0}
					onValidate={handleValidatePhase1}
					onSkipToPhase2={handleGoToPhase2}
				/>
			</div>
		);
	};

	/**
	 * Rendu de Phase 2
	 */
	const renderPhase2 = () => {
		if (!analysis) return null;

		return (
			<div className='space-y-6'>
				{/* Résumé du ticket */}
				<ReceiptSummary analysis={analysis} />

				{/* Message Phase 2 */}
				<Alert variant='default'>
					<AlertTriangle className='size-4' />
					<AlertDescription>
						Ces produits nécessitent une attention particulière.
						Vous pouvez rechercher manuellement, scanner un
						code-barres, ou créer un produit frais.
					</AlertDescription>
				</Alert>

				{/* Liste des produits Phase 2 */}
				<div className='space-y-4'>
					{phase2Products.map((product) => (
						<Card key={product.id}>
							<CardContent className='p-4'>
								<p className='font-medium'>{product.name}</p>
								<p className='text-sm text-muted-foreground'>
									Quantité : {product.quantity || 1} • Prix :{' '}
									{product.totalPrice?.toFixed(2)}€
								</p>
								<p className='text-xs text-orange-600 mt-2'>
									Phase 2 : Produit difficile à identifier
								</p>
								{/* TODO: Actions Phase 2 (recherche, scan, création manuelle) */}
							</CardContent>
						</Card>
					))}
				</div>

				{/* Bouton ajout inventaire */}
				{canAddToInventory && (
					<Button
						size='lg'
						className='w-full'
						onClick={handleAddToInventory}>
						Ajouter {stats.validatedCount} produits à l'inventaire
					</Button>
				)}
			</div>
		);
	};

	// ===== RENDU PRINCIPAL =====

	// Chargement
	if (status === 'analyzing' || !analysis) {
		return (
			<div className='container mx-auto px-4 py-8'>
				<div className='max-w-4xl mx-auto'>
					<div className='flex items-center justify-center py-12'>
						<Loader2 className='size-8 animate-spin text-primary' />
					</div>
				</div>
			</div>
		);
	}

	// Erreur
	if (status === 'error' || error) {
		return (
			<div className='container mx-auto px-4 py-8'>
				<div className='max-w-4xl mx-auto'>
					{renderHeader()}

					<Alert variant='destructive'>
						<AlertTriangle className='size-4' />
						<AlertDescription>
							{error || 'Une erreur est survenue'}
						</AlertDescription>
					</Alert>

					<div className='mt-4 space-x-2'>
						<Button variant='outline' onClick={handleCancel}>
							Retour à l'inventaire
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='container mx-auto px-4 py-8'>
			<div className='max-w-4xl mx-auto'>
				{renderHeader()}

				{/* Afficher Phase 1 ou Phase 2 */}
				{currentPhase === 1 ? renderPhase1() : renderPhase2()}
			</div>
		</div>
	);
};

export default ReceiptResultsPage;
