import type { LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

export default function AdminPlaceholderPage({
	title,
	description,
	icon: Icon,
}: {
	title: string;
	description: string;
	icon: LucideIcon;
}) {
	return (
		<div className='space-y-6'>
			<header>
				<p className='text-sm font-medium text-primary'>Administration</p>
				<h1 className='text-2xl font-semibold text-neutral-900'>{title}</h1>
			</header>
			<Card>
				<CardContent className='p-8 text-center'>
					<Icon className='mx-auto mb-3 size-8 text-neutral-400' />
					<p className='text-sm text-neutral-600'>{description}</p>
				</CardContent>
			</Card>
		</div>
	);
}
