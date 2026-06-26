import { describe, expect, it, vi } from 'vitest';
import type { AnchorHTMLAttributes } from 'react';

import { render, screen } from '@/test/utils';
import { InventoryItemCard } from './InventoryList';
import type { InventoryItemWithStatus } from '@/schemas';

vi.mock('@tanstack/react-router', () => ({
	Link: ({
		children,
		...props
	}: AnchorHTMLAttributes<HTMLAnchorElement>) => (
		<a href='#details' {...props}>
			{children}
		</a>
	),
}));

const groupedCristalineItem: InventoryItemWithStatus = {
	id: '22222222-2222-4222-8222-222222222222',
	userId: '33333333-3333-4333-8333-333333333333',
	quantity: 4,
	expiryDate: '2026-07-10T00:00:00.000Z',
	expiryDateSource: 'MANUAL',
	purchaseDate: '2026-06-01T00:00:00.000Z',
	purchasePrice: 3,
	createdAt: '2026-06-01T08:00:00.000Z',
	updatedAt: '2026-06-02T08:00:00.000Z',
	expiryStatus: 'GOOD',
	product: {
		id: '44444444-4444-4444-8444-444444444444',
		name: 'Cristaline',
		category: {
			id: '55555555-5555-4555-8555-555555555555',
			name: 'Boissons',
			slug: 'boissons',
		},
		unitType: 'UNIT',
		createdAt: '2026-06-01T08:00:00.000Z',
		updatedAt: '2026-06-01T08:00:00.000Z',
	},
	lots: [
		{
			id: '22222222-2222-4222-8222-222222222222',
			quantity: 2,
			expiryDate: '2026-07-10T00:00:00.000Z',
			expiryDateSource: 'MANUAL',
			purchaseDate: '2026-06-01T00:00:00.000Z',
			purchasePrice: 1.5,
			createdAt: '2026-06-01T08:00:00.000Z',
			updatedAt: '2026-06-01T08:00:00.000Z',
		},
		{
			id: '66666666-6666-4666-8666-666666666666',
			quantity: 2,
			expiryDate: '2026-07-20T00:00:00.000Z',
			expiryDateSource: 'MANUAL',
			purchaseDate: '2026-06-02T00:00:00.000Z',
			purchasePrice: 1.5,
			createdAt: '2026-06-02T08:00:00.000Z',
			updatedAt: '2026-06-02T08:00:00.000Z',
		},
	],
};

describe('InventoryItemCard', () => {
	it('affiche la quantité totale et le détail des lots', () => {
		render(
			<InventoryItemCard
				item={groupedCristalineItem}
				onRemove={vi.fn()}
				isRemoving={false}
				isSelected={false}
				isSelectionMode={false}
				onToggleSelection={vi.fn()}
			/>,
		);

		expect(screen.getByText('Cristaline')).toBeInTheDocument();
		expect(screen.getByText('4 unités')).toBeInTheDocument();
		expect(screen.getByText('2 lots')).toBeInTheDocument();
		expect(screen.getAllByText('2 unités')).toHaveLength(2);
	});
});
