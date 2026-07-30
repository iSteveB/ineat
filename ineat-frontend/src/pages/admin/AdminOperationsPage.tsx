import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { adminKeys } from '@/pages/admin/adminKeys';
import { adminService } from '@/services/adminService';

type FailedJob = {
	queueName: string;
	id: string;
	name: string;
	attemptsMade: number;
	failedReason: string;
	failedAt: string;
};

const healthLabels = {
	healthy: 'Sain',
	degraded: 'Dégradé',
	critical: 'Critique',
} as const;

const formatDuration = (milliseconds: number) => {
	if (milliseconds < 1000) return 'Aucune attente';
	const minutes = Math.floor(milliseconds / 60_000);
	if (minutes < 60) return `${minutes} min`;
	return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};

export default function AdminOperationsPage() {
	const queryClient = useQueryClient();
	const [jobToRetry, setJobToRetry] = useState<FailedJob | null>(null);
	const [reason, setReason] = useState('');
	const queuesQuery = useQuery({
		queryKey: adminKeys.queues,
		queryFn: adminService.getQueues,
		refetchInterval: 15_000,
	});
	const retryMutation = useMutation({
		mutationFn: ({
			job,
			justification,
		}: {
			job: FailedJob;
			justification: string;
		}) => adminService.retryQueueJob(job.queueName, job.id, justification),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: adminKeys.queues });
			closeDialog();
			toast.success('Job replacé dans la file');
		},
		onError: (error: Error) => toast.error(error.message),
	});
	const closeDialog = () => {
		setJobToRetry(null);
		setReason('');
	};
	const confirmRetry = () => {
		if (!jobToRetry || reason.trim().length < 3) return;
		retryMutation.mutate({ job: jobToRetry, justification: reason.trim() });
	};

	if (queuesQuery.isLoading) {
		return (
			<p className='text-sm text-neutral-600'>
				Chargement de l’état des files…
			</p>
		);
	}
	if (queuesQuery.isError || !queuesQuery.data) {
		return (
			<Card>
				<CardContent className='space-y-3 p-8 text-center'>
					<AlertTriangle className='mx-auto size-8 text-error-600' />
					<p className='font-medium'>Supervision indisponible</p>
					<Button variant='outline' onClick={() => queuesQuery.refetch()}>
						Réessayer
					</Button>
				</CardContent>
			</Card>
		);
	}

	const snapshot = queuesQuery.data;
	const failedJobs = snapshot.queues.flatMap((queue) =>
		queue.failedJobs.map((job) => ({ ...job, queueName: queue.name }))
	);
	return (
		<div className='space-y-6'>
			<header className='flex flex-wrap items-start justify-between gap-4'>
				<div>
					<p className='text-sm font-medium text-primary'>Exploitation</p>
					<h1 className='text-2xl font-semibold text-neutral-900'>
						Files et jobs
					</h1>
					<p className='mt-1 text-sm text-neutral-600'>
						Actualisation automatique toutes les 15 secondes. Les données métier
						des jobs ne sont jamais exposées.
					</p>
				</div>
				<Button
					variant='outline'
					onClick={() => queuesQuery.refetch()}
					disabled={queuesQuery.isFetching}
				>
					<RefreshCw
						className={`size-4 ${queuesQuery.isFetching ? 'animate-spin' : ''}`}
					/>{' '}
					Actualiser
				</Button>
			</header>

			<Card>
				<CardContent className='flex flex-wrap items-center justify-between gap-4 p-5'>
					<div className='flex items-center gap-3'>
						{snapshot.health === 'healthy' ? (
							<CheckCircle2 className='size-7 text-success-600' />
						) : (
							<AlertTriangle className='size-7 text-error-600' />
						)}
						<div>
							<p className='text-sm text-neutral-500'>Santé globale</p>
							<p className='text-xl font-semibold'>
								{healthLabels[snapshot.health]}
							</p>
						</div>
					</div>
					<p className='text-xs text-neutral-500'>
						Dernier relevé :{' '}
						{new Intl.DateTimeFormat('fr-FR', {
							dateStyle: 'short',
							timeStyle: 'medium',
						}).format(new Date(snapshot.timestamp))}
					</p>
				</CardContent>
			</Card>

			<section className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
				{snapshot.queues.map((queue) => (
					<Card key={queue.name}>
						<CardHeader>
							<div className='flex items-center justify-between gap-3'>
								<CardTitle className='flex items-center gap-2 text-base'>
									<Activity className='size-4' /> {queue.name}
								</CardTitle>
								<HealthBadge health={queue.health} />
							</div>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div className='grid grid-cols-3 gap-2 text-center'>
								<Count label='Attente' value={queue.counts.waiting} />
								<Count label='Actifs' value={queue.counts.active} />
								<Count label='Échecs' value={queue.counts.failed} />
							</div>
							<div className='text-xs text-neutral-500'>
								<p>
									Plus ancien en attente :{' '}
									{formatDuration(queue.oldestWaitingAgeMs)}
								</p>
								<p>Échecs sur 1 h : {queue.recentFailuresLastHour}</p>
							</div>
						</CardContent>
					</Card>
				))}
			</section>

			<Card>
				<CardHeader>
					<CardTitle>Jobs en échec ({failedJobs.length})</CardTitle>
				</CardHeader>
				<CardContent className='p-0'>
					{failedJobs.length === 0 ? (
						<p className='p-6 text-sm text-success-700'>Aucun job en échec.</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>File / job</TableHead>
									<TableHead>Échec</TableHead>
									<TableHead>Tentatives</TableHead>
									<TableHead>Date</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{failedJobs.map((job) => (
									<TableRow key={`${job.queueName}:${job.id}`}>
										<TableCell>
											<p className='font-medium'>{job.name}</p>
											<p className='font-mono text-xs text-neutral-500'>
												{job.queueName} · {job.id}
											</p>
										</TableCell>
										<TableCell className='max-w-md text-sm text-error-700'>
											{job.failedReason}
										</TableCell>
										<TableCell>{job.attemptsMade}</TableCell>
										<TableCell>
											{new Intl.DateTimeFormat('fr-FR', {
												dateStyle: 'short',
												timeStyle: 'short',
											}).format(new Date(job.failedAt))}
										</TableCell>
										<TableCell>
											<Button
												variant='outline'
												size='sm'
												onClick={() => setJobToRetry(job)}
											>
												<RefreshCw className='size-4' /> Relancer
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<AlertDialog
				open={Boolean(jobToRetry)}
				onOpenChange={(open) => !open && closeDialog()}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Relancer ce job en échec ?</AlertDialogTitle>
						<AlertDialogDescription>
							Le job sera replacé dans sa file. Son exécution peut déclencher un
							nouvel envoi ou traitement métier. Cette commande sera auditée.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<label className='space-y-1.5 text-sm font-medium'>
						Justification obligatoire
						<Textarea
							value={reason}
							onChange={(event) => setReason(event.target.value)}
						/>
					</label>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={closeDialog}>Annuler</AlertDialogCancel>
						<AlertDialogAction
							disabled={reason.trim().length < 3 || retryMutation.isPending}
							onClick={confirmRetry}
						>
							Relancer le job
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function HealthBadge({ health }: { health: keyof typeof healthLabels }) {
	return (
		<Badge variant={health === 'healthy' ? 'secondary' : 'outline'}>
			{healthLabels[health]}
		</Badge>
	);
}

function Count({ label, value }: { label: string; value: number }) {
	return (
		<div className='rounded-lg bg-neutral-50 p-2'>
			<p className='text-lg font-semibold'>{value}</p>
			<p className='text-xs text-neutral-500'>{label}</p>
		</div>
	);
}
