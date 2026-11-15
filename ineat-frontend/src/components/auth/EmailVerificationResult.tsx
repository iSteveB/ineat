import { CircleCheck, CircleX } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '../ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from '../ui/card';

const errorMessages: Record<string, string> = {
	TOKEN_EXPIRED: 'Ce lien a expiré. Connectez-vous pour en recevoir un nouveau.',
	INVALID_TOKEN: 'Ce lien n’est pas valide ou a déjà servi.',
	USER_NOT_FOUND: 'Ce lien n’est plus valide.',
};

interface EmailVerificationResultProps {
	error?: string;
}

const EmailVerificationResult = ({ error }: EmailVerificationResultProps) => {
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
					{hasError ? 'Lien non valide' : 'Adresse e-mail confirmée'}
				</h1>
				<CardDescription>
					{hasError
						? errorMessages[error ?? ''] ?? 'Ce lien n’a pas pu être vérifié.'
						: 'Votre compte est prêt. Il ne reste plus qu’à remplir votre frigo virtuel.'}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button asChild className='w-full'>
					<Link to={hasError ? '/login' : '/app'}>
						{hasError ? 'Retour à la connexion' : 'Continuer vers InEat'}
					</Link>
				</Button>
			</CardContent>
		</Card>
	);
};

export default EmailVerificationResult;
