import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { forwardRef, useEffect, useState } from 'react';
import type { ComponentProps } from 'react';

import { NotificationCenter } from './NotificationCenter';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { notificationService } from '@/services/notificationService';

function useDesktopNotifications() {
	const [isDesktop, setIsDesktop] = useState(false);

	useEffect(() => {
		const media = window.matchMedia('(min-width: 768px)');
		const update = () => setIsDesktop(media.matches);
		update();
		media.addEventListener('change', update);
		return () => media.removeEventListener('change', update);
	}, []);

	return isDesktop;
}

const BellButton = forwardRef<
	HTMLButtonElement,
	{ unreadCount: number } & ComponentProps<typeof Button>
>(function BellButton({ unreadCount, ...props }, ref) {
	return (
		<Button
			ref={ref}
			variant='ghost'
			size='icon'
			className='relative cursor-pointer'
			aria-label={
				unreadCount > 0
					? `Notifications, ${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
					: 'Notifications'
			}
			{...props}>
			<Bell className='size-5' />
			{unreadCount > 0 && (
				<span className='absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-error-500 text-[10px] font-semibold text-neutral-50'>
					{unreadCount > 9 ? '9+' : unreadCount}
				</span>
			)}
		</Button>
	);
});

export function NotificationBell() {
	const [open, setOpen] = useState(false);
	const isDesktop = useDesktopNotifications();
	const { data: unreadCount = 0 } = useQuery({
		queryKey: ['notifications', 'unread-count'],
		queryFn: () => notificationService.getUnreadCount(),
		staleTime: 60_000,
	});

	if (isDesktop) {
		return (
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<BellButton unreadCount={unreadCount} />
				</PopoverTrigger>
				<PopoverContent
					align='end'
					className='max-h-[75vh] w-[26rem] overflow-y-auto p-0'>
					<NotificationCenter compact onNavigate={() => setOpen(false)} />
				</PopoverContent>
			</Popover>
		);
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<BellButton unreadCount={unreadCount} />
			</DialogTrigger>
			<DialogContent className='h-[100dvh] max-w-none translate-y-[-50%] overflow-y-auto rounded-none border-0 p-0'>
				<DialogHeader className='sr-only'>
					<DialogTitle>Notifications</DialogTitle>
				</DialogHeader>
				<NotificationCenter compact onNavigate={() => setOpen(false)} />
			</DialogContent>
		</Dialog>
	);
}
