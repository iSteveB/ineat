import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, History, Search } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { adminKeys } from '@/pages/admin/adminKeys';
import {
	adminService,
	type AdminAuditLog,
	type AdminAuditQuery,
} from '@/services/adminService';

const formatDate = (value: string) =>
	new Intl.DateTimeFormat('fr-FR', {
		dateStyle: 'short',
		timeStyle: 'medium',
	}).format(new Date(value));

export default function AdminAuditPage() {
	const [query, setQuery] = useState<AdminAuditQuery>({
		page: 1,
		pageSize: 25,
		order: 'desc',
	});
	const [draft, setDraft] = useState<AdminAuditQuery>({ order: 'desc' });
	const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);
	const auditQuery = useQuery({
		queryKey: adminKeys.audit(query),
		queryFn: () => adminService.listAuditLogs(query),
		placeholderData: (previous) => previous,
	});
	const updateQuery = (values: Partial<AdminAuditQuery>) =>
		setQuery((current) => ({ ...current, ...values }));
	const applyFilters = () =>
		setQuery({ ...draft, page: 1, pageSize: query.pageSize ?? 25 });
	const resetFilters = () => {
		setDraft({ order: 'desc' });
		setQuery({ page: 1, pageSize: query.pageSize ?? 25, order: 'desc' });
	};
	const data = auditQuery.data;
	const logs = data?.items ?? [];
	return (
		<div className='space-y-6'>
			<header>
				<p className='text-sm font-medium text-primary'>Traçabilité</p>
				<h1 className='flex items-center gap-2 text-2xl font-semibold text-neutral-900'>
					<History className='size-6' /> Journal d’audit
				</h1>
				<p className='mt-1 text-sm text-neutral-600'>
					Historique immuable des commandes administrateur et de leur
					justification.
				</p>
			</header>

			<Card>
				<CardHeader>
					<CardTitle>Filtres</CardTitle>
				</CardHeader>
				<CardContent className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
					<label className='relative'>
						<span className='sr-only'>Action</span>
						<Search className='pointer-events-none absolute left-3 top-3 size-4 text-neutral-400' />
						<Input
							className='pl-9'
							value={draft.action ?? ''}
							onChange={(event) =>
								setDraft((current) => ({
									...current,
									action: event.target.value || undefined,
								}))
							}
							placeholder='Action exacte'
						/>
					</label>
					<Input
						aria-label='Type de ressource'
						value={draft.resourceType ?? ''}
						onChange={(event) =>
							setDraft((current) => ({
								...current,
								resourceType: event.target.value || undefined,
							}))
						}
						placeholder='Type de ressource'
					/>
					<Input
						aria-label='Identifiant de ressource'
						value={draft.resourceId ?? ''}
						onChange={(event) =>
							setDraft((current) => ({
								...current,
								resourceId: event.target.value || undefined,
							}))
						}
						placeholder='Identifiant de ressource'
					/>
					<Input
						aria-label='Identifiant administrateur'
						value={draft.adminUserId ?? ''}
						onChange={(event) =>
							setDraft((current) => ({
								...current,
								adminUserId: event.target.value || undefined,
							}))
						}
						placeholder='UUID administrateur'
					/>
					<label className='space-y-1 text-xs text-neutral-600'>
						À partir du
						<Input
							type='datetime-local'
							onChange={(event) =>
								setDraft((current) => ({
									...current,
									from: event.target.value
										? new Date(event.target.value).toISOString()
										: undefined,
								}))
							}
						/>
					</label>
					<label className='space-y-1 text-xs text-neutral-600'>
						Jusqu’au
						<Input
							type='datetime-local'
							onChange={(event) =>
								setDraft((current) => ({
									...current,
									to: event.target.value
										? new Date(event.target.value).toISOString()
										: undefined,
								}))
							}
						/>
					</label>
					<label className='space-y-1 text-xs text-neutral-600'>
						Ordre
						<select
							className='h-9 w-full rounded-md border bg-white px-3 text-sm'
							value={draft.order}
							onChange={(event) =>
								setDraft((current) => ({
									...current,
									order: event.target.value as 'asc' | 'desc',
								}))
							}
						>
							<option value='desc'>Plus récent</option>
							<option value='asc'>Plus ancien</option>
						</select>
					</label>
					<div className='flex items-end gap-2'>
						<Button onClick={applyFilters}>Appliquer</Button>
						<Button variant='outline' onClick={resetFilters}>
							Réinitialiser
						</Button>
					</div>
				</CardContent>
			</Card>

			<div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]'>
				<Card>
					<CardContent className='p-0'>
						{auditQuery.isLoading ? (
							<p className='p-6 text-sm'>Chargement…</p>
						) : auditQuery.isError ? (
							<div className='space-y-3 p-6 text-sm text-error-700'>
								<p>Impossible de charger le journal d’audit.</p>
								<Button
									variant='outline'
									size='sm'
									onClick={() => auditQuery.refetch()}
								>
									Réessayer
								</Button>
							</div>
						) : logs.length === 0 ? (
							<p className='p-6 text-sm text-neutral-600'>Aucune entrée.</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Date</TableHead>
										<TableHead>Administrateur</TableHead>
										<TableHead>Action</TableHead>
										<TableHead>Ressource</TableHead>
										<TableHead>Justification</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{logs.map((log) => (
										<TableRow
											key={log.id}
											className='cursor-pointer'
											onClick={() => setSelectedLog(log)}
										>
											<TableCell className='whitespace-nowrap text-xs'>
												{formatDate(log.createdAt)}
											</TableCell>
											<TableCell>
												<p className='text-sm font-medium'>
													{log.admin.firstName} {log.admin.lastName}
												</p>
												<p className='text-xs text-neutral-500'>
													{log.admin.email}
												</p>
											</TableCell>
											<TableCell>
												<Badge variant='outline'>{log.action}</Badge>
											</TableCell>
											<TableCell>
												<p className='text-sm'>{log.resourceType}</p>
												<p className='max-w-48 truncate font-mono text-xs text-neutral-500'>
													{log.resourceId}
												</p>
											</TableCell>
											<TableCell className='max-w-56 truncate text-sm'>
												{log.reason}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
				<Card className='h-fit xl:sticky xl:top-4'>
					<CardHeader>
						<CardTitle>Détail</CardTitle>
					</CardHeader>
					<CardContent>
						{selectedLog ? (
							<AuditDetail log={selectedLog} />
						) : (
							<p className='text-sm text-neutral-600'>
								Sélectionnez une entrée pour consulter les changements.
							</p>
						)}
					</CardContent>
				</Card>
			</div>

			{data && (
				<div className='flex items-center justify-between'>
					<p className='text-sm text-neutral-600'>
						{data.pagination.totalItems} entrée(s) · page {data.pagination.page}
						/{data.pagination.totalPages}
					</p>
					<div className='flex gap-2'>
						<Button
							variant='outline'
							size='sm'
							disabled={data.pagination.page <= 1}
							onClick={() => updateQuery({ page: data.pagination.page - 1 })}
						>
							<ChevronLeft className='size-4' /> Précédent
						</Button>
						<Button
							variant='outline'
							size='sm'
							disabled={data.pagination.page >= data.pagination.totalPages}
							onClick={() => updateQuery({ page: data.pagination.page + 1 })}
						>
							Suivant <ChevronRight className='size-4' />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

function AuditDetail({ log }: { log: AdminAuditLog }) {
	return (
		<div className='space-y-4 text-sm'>
			<div>
				<p className='text-xs text-neutral-500'>Action</p>
				<p className='break-words font-medium'>{log.action}</p>
			</div>
			<div>
				<p className='text-xs text-neutral-500'>Ressource</p>
				<p className='break-all font-mono text-xs'>
					{log.resourceType} · {log.resourceId}
				</p>
				{log.resourceType === 'USER' && (
					<a
						className='mt-2 inline-block font-medium text-primary hover:underline'
						href={`/app/admin/users/${encodeURIComponent(log.resourceId)}`}
					>
						Voir la fiche utilisateur
					</a>
				)}
			</div>
			<div>
				<p className='text-xs text-neutral-500'>Justification</p>
				<p>{log.reason}</p>
			</div>
			<JsonValue label='Avant' value={log.previousValue} />
			<JsonValue label='Après' value={log.newValue} />
			<div className='border-t pt-3 text-xs text-neutral-500'>
				<p>IP : {log.ipAddress ?? 'Non disponible'}</p>
				<p className='break-all'>
					Session : {log.sessionId ?? 'Non disponible'}
				</p>
			</div>
		</div>
	);
}

function JsonValue({ label, value }: { label: string; value: unknown }) {
	return (
		<div>
			<p className='mb-1 text-xs text-neutral-500'>{label}</p>
			<pre className='max-h-56 overflow-auto rounded-lg bg-neutral-950 p-3 text-xs text-neutral-50'>
				{value === null ? '—' : JSON.stringify(value, null, 2)}
			</pre>
		</div>
	);
}
