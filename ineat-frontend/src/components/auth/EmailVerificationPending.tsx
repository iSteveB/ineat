import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { MailCheck } from 'lucide-react';
import { authService } from '@/services/authService';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../ui/card';

interface EmailVerificationPendingProps {
	email: string;
}

const EmailVerificationPending = ({ email }: EmailVerificationPendingProps) => {
	const navigate = useNavigate();
	const [isSending, setIsSending] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [cooldownSeconds, setCooldownSeconds] = useState(0);

	useEffect(() => {
		if (cooldownSeconds === 0) return;

		const timer = window.setTimeout(
			() => setCooldownSeconds((seconds) => Math.max(0, seconds - 1)),
			1000
		);
		return () => window.clearTimeout(timer);
	}, [cooldownSeconds]);

	const resend = async () => {
		if (isSending || cooldownSeconds > 0) return;

		setIsSending(true);
		setMessage(null);
		setError(null);

		try {
			await authService.resendVerificationEmail(email);
			setMessage(
				"Si cette adresse correspond à un compte en attente, un nouvel email vient d'être envoyé."
			);
			setCooldownSeconds(60);
		} catch (caughtError) {
			setError(
				caughtError instanceof Error
					? caughtError.message
					: "Impossible de renvoyer l'email."
			);
		} finally {
			setIsSending(false);
		}
	};

	return (
		<Card className='w-full max-w-md mx-auto'>
			<CardHeader className='text-center'>
				<MailCheck className='mx-auto mb-2 size-10 text-primary' aria-hidden />
				<CardTitle>Vérifiez votre boîte mail</CardTitle>
				<CardDescription>
					Nous avons envoyé un lien de vérification à <strong>{email}</strong>.
					 Il est valable pendant 60 minutes.
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				<p className='text-sm text-muted-foreground'>
					Cliquez sur le lien reçu avant de vous connecter. Pensez à vérifier vos
					 courriers indésirables.
				</p>
				{message && (
					<Alert data-testid='resend-success'>
						<AlertDescription>{message}</AlertDescription>
					</Alert>
				)}
				{error && (
					<Alert variant='error' data-testid='resend-error'>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
				<Button
					className='w-full'
					onClick={resend}
					disabled={isSending || cooldownSeconds > 0}>
					{isSending
						? 'Envoi en cours…'
						: cooldownSeconds > 0
							? `Renvoyer dans ${cooldownSeconds} s`
							: "Renvoyer l'email"}
				</Button>
			</CardContent>
			<CardFooter className='justify-center'>
				<Button variant='link' onClick={() => navigate({ to: '/login' })}>
					Retour à la connexion
				</Button>
			</CardFooter>
		</Card>
	);
};

export default EmailVerificationPending;
