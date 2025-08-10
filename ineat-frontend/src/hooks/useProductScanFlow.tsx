import { useState, useCallback } from "react";

export type FlowStep = 'scan' | 'form' | 'success' | 'not-found';
/**
 * Hook utilitaire pour gérer le flow de scan
 */
export const useProductScanFlow = () => {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [step, setStep] = useState<FlowStep>('scan');

	const openScanner = useCallback(() => {
		setStep('scan');
		setIsOpen(true);
	}, []);

	const closeScanner = useCallback(() => {
		setIsOpen(false);
	}, []);

	const openManualForm = useCallback(() => {
		setStep('form');
		setIsOpen(true);
	}, []);

	return {
		isOpen,
		step,
		openScanner,
		closeScanner,
		openManualForm,
		setStep,
	} as const;
};
