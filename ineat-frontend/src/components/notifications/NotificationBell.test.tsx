import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationBell } from './NotificationBell';
import { notificationService } from '@/services/notificationService';

vi.mock('./NotificationCenter', () => ({
	NotificationCenter: ({ onNavigate }: { onNavigate?: () => void }) => (
		<button onClick={onNavigate}>Centre de notifications</button>
	),
}));

vi.mock('@/services/notificationService', () => ({
	notificationService: {
		getUnreadCount: vi.fn(),
	},
}));

function setDesktop(matches: boolean) {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockImplementation(() => ({
			matches,
			media: '(min-width: 768px)',
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
}

function renderBell() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<NotificationBell />
		</QueryClientProvider>
	);
}

describe('NotificationBell', () => {
	beforeEach(() => {
		(notificationService.getUnreadCount as ReturnType<typeof vi.fn>).mockResolvedValue(
			3
		);
	});

	it.each([
		['desktop', true],
		['mobile', false],
	])('ouvre et ferme le centre sur %s', async (_label, isDesktop) => {
		setDesktop(isDesktop);
		const user = userEvent.setup();
		renderBell();

		const trigger = await screen.findByRole('button', {
			name: 'Notifications, 3 non lues',
		});
		await user.click(trigger);
		expect(
			await screen.findByRole('button', {
				name: 'Centre de notifications',
			})
		).toBeInTheDocument();

		await user.click(
			screen.getByRole('button', { name: 'Centre de notifications' })
		);
		await waitFor(() =>
			expect(
				screen.queryByRole('button', {
					name: 'Centre de notifications',
				})
			).not.toBeInTheDocument()
		);
	});
});
