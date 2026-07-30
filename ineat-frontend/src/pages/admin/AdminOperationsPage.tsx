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
import {
	adminService,
	type AdminIncidentType,
	type AdminQueueJobState,
} from '@/services/adminService';

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
	const [queueName, setQueueName] = useState('');
	const [jobState, setJobState] = useState<AdminQueueJobState>('failed');
	const [jobsPage, setJobsPage] = useState(1);
	const [incidentType, setIncidentType] =
		useState<AdminIncidentType>('INVOICE');
	const [incidentsPage, setIncidentsPage] = useState(1);
	const queuesQuery = useQuery({
		queryKey: adminKeys.queues,
		queryFn: adminService.getQueues,
		refetchInterval: 15_000,
	});
	const selectedQueue = queueName || queuesQuery.data?.queues[0]?.name || '';
	const jobsQuery = useQuery({
		queryKey: adminKeys.queueJobs(selectedQueue, jobState, jobsPage),
		queryFn: () =>
			adminService.listQueueJobs(selectedQueue, jobState, jobsPage, 25),
		enabled: Boolean(selectedQueue),
	});
	const incidentsQuery = useQuery({
		queryKey: adminKeys.incidents(incidentType, incidentsPage),
		queryFn: () => adminService.listIncidents(incidentType, incidentsPage, 25),
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
			queryClient.invalidateQueries({
				queryKey: ['admin', 'queues', selectedQueue],
			});
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
					<CardTitle>Explorateur de jobs</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='flex flex-wrap gap-3'>
						<label className='space-y-1 text-sm font-medium'>
							File
							<select
								aria-label='File'
								className='block h-10 rounded-md border border-neutral-300 bg-white px-3'
								value={selectedQueue}
								onChange={(event) => {
									setQueueName(event.target.value);
									setJobsPage(1);
								}}
							>
								{snapshot.queues.map((queue) => (
									<option key={queue.name} value={queue.name}>
										{queue.name}
									</option>
								))}
							</select>
						</label>
						<label className='space-y-1 text-sm font-medium'>
							État
							<select
								aria-label='État du job'
								className='block h-10 rounded-md border border-neutral-300 bg-white px-3'
								value={jobState}
								onChange={(event) => {
									setJobState(event.target.value as AdminQueueJobState);
									setJobsPage(1);
								}}
							>
								<option value='waiting'>En attente</option>
								<option value='active'>Actifs</option>
								<option value='failed'>En échec</option>
							</select>
						</label>
					</div>
					<PagedStatus
						loading={jobsQuery.isLoading}
						error={jobsQuery.isError}
						empty={!jobsQuery.data?.items.length}
					/>
					{jobsQuery.data?.items.length ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Job</TableHead>
									<TableHead>État / erreur</TableHead>
									<TableHead>Tentatives</TableHead>
									<TableHead>Date</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{jobsQuery.data.items.map((job) => (
									<TableRow key={job.id}>
										<TableCell>
											<p className='font-medium'>{job.name}</p>
											<p className='font-mono text-xs text-neutral-500'>
												{job.id}
											</p>
										</TableCell>
										<TableCell>{job.failedReason || job.state}</TableCell>
										<TableCell>{job.attemptsMade}</TableCell>
										<TableCell>
											{formatDate(
												job.finishedAt || job.processedAt || job.createdAt
											)}
										</TableCell>
										<TableCell>
											{job.state === 'failed' && (
												<Button
													variant='outline'
													size='sm'
													onClick={() =>
														setJobToRetry({
															queueName: selectedQueue,
															id: job.id,
															name: job.name,
															attemptsMade: job.attemptsMade,
															failedReason:
																job.failedReason || 'Erreur non renseignée',
															failedAt: job.finishedAt || job.createdAt,
														})
													}
												>
													<RefreshCw className='size-4' /> Relancer
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : null}
					<Pagination
						page={jobsQuery.data?.pagination.page || jobsPage}
						totalPages={jobsQuery.data?.pagination.totalPages || 1}
						onChange={setJobsPage}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Incidents applicatifs</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					<label className='space-y-1 text-sm font-medium'>
						Source
						<select
							aria-label="Type d'incident"
							className='block h-10 rounded-md border border-neutral-300 bg-white px-3'
							value={incidentType}
							onChange={(event) => {
								setIncidentType(event.target.value as AdminIncidentType);
								setIncidentsPage(1);
							}}
						>
							<option value='INVOICE'>Analyses de factures</option>
							<option value='NOTIFICATION'>Notifications</option>
							<option value='STRIPE_WEBHOOK'>Webhooks Stripe</option>
							<option value='RESEND'>Webhooks Resend</option>
						</select>
					</label>
					<PagedStatus
						loading={incidentsQuery.isLoading}
						error={incidentsQuery.isError}
						empty={!incidentsQuery.data?.items.length}
					/>
					{incidentsQuery.data?.items.length ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Incident</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Erreur</TableHead>
									<TableHead>Date</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{incidentsQuery.data.items.map((incident) => (
									<TableRow key={incident.id}>
										<TableCell>
											<p className='font-medium'>{incident.category}</p>
											<p className='font-mono text-xs text-neutral-500'>
												{incident.id}
											</p>
										</TableCell>
										<TableCell>{incident.subtype || incident.status}</TableCell>
										<TableCell className='max-w-md'>{incident.error}</TableCell>
										<TableCell>{formatDate(incident.occurredAt)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : null}
					<Pagination
						page={incidentsQuery.data?.pagination.page || incidentsPage}
						totalPages={incidentsQuery.data?.pagination.totalPages || 1}
						onChange={setIncidentsPage}
					/>
				</CardContent>
			</Card>

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

function formatDate(value: string) {
	return new Intl.DateTimeFormat('fr-FR', {
		dateStyle: 'short',
		timeStyle: 'short',
	}).format(new Date(value));
}

function PagedStatus({
	loading,
	error,
	empty,
}: {
	loading: boolean;
	error: boolean;
	empty: boolean;
}) {
	if (loading) return <p className='text-sm text-neutral-500'>Chargement…</p>;
	if (error)
		return <p className='text-sm text-error-700'>Données indisponibles.</p>;
	if (empty) return <p className='text-sm text-neutral-500'>Aucun résultat.</p>;
	return null;
}

function Pagination({
	page,
	totalPages,
	onChange,
}: {
	page: number;
	totalPages: number;
	onChange: (page: number) => void;
}) {
	return (
		<div className='flex items-center justify-end gap-3 text-sm'>
			<Button
				variant='outline'
				size='sm'
				disabled={page <= 1}
				onClick={() => onChange(page - 1)}
			>
				Précédent
			</Button>
			<span>
				Page {page} sur {totalPages}
			</span>
			<Button
				variant='outline'
				size='sm'
				disabled={page >= totalPages}
				onClick={() => onChange(page + 1)}
			>
				Suivant
			</Button>
		</div>
	);
}
