import { CircleCheck, CircleX } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '../ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from '../ui/card';

const errorMessages: Record<string, string> = {
	TOKEN_EXPIRED: 'Ce lien de vérification a expiré.',
	INVALID_TOKEN: "Ce lien de vérification n'est pas valide ou a déjà été utilisé.",
	USER_NOT_FOUND: "Ce lien de vérification n'est plus valide.",
};

interface EmailVerificationResultProps {
	error?: string;
}

const EmailVerificationResult = ({ error }: EmailVerificationResultProps) => {
	const navigate = useNavigate();
	const hasError = Boolean(error);

	return (
		<Card className='mx-auto w-full max-w-md border border-neutral-200 p-6 text-center shadow-sm sm:p-8'>
			<CardHeader>
				{hasError ? (
					<CircleX className='mx-auto mb-2 size-10 text-destructive' aria-hidden />
				) : (
					<CircleCheck className='mx-auto mb-2 size-10 text-primary' aria-hidden />
				)}
				<h1 className='type-h1 text-neutral-900'>
					{hasError ? 'Lien non valide' : 'Adresse email vérifiée'}
				</h1>
				<CardDescription>
					{hasError
						? errorMessages[error ?? ''] ?? "Ce lien n'a pas pu être vérifié."
						: 'Votre compte est maintenant actif. Vous pouvez accéder à InEat.'}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button
					className='w-full'
					onClick={() => navigate({ to: hasError ? '/login' : '/app' })}>
					{hasError ? 'Retour à la connexion' : 'Continuer vers InEat'}
				</Button>
			</CardContent>
		</Card>
	);
};

export default EmailVerificationResult;
