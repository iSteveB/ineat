import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ScannerPage from './ScannerPage';

const mocks = vi.hoisted(() => ({
	hideNavigation: vi.fn(),
	showNavigation: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
	useNavigate: () => vi.fn(),
}));

vi.mock('@/features/scan/ProductScanFlow', () => ({
	ProductScanFlow: () => <div>Flux de scan</div>,
}));

vi.mock('@/stores/navigationStore', () => ({
	useNavigationStore: () => ({
		hideNavigation: mocks.hideNavigation,
		showNavigation: mocks.showNavigation,
	}),
}));

describe('ScannerPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('permet de faire défiler le formulaire plein écran', () => {
		const { container } = render(<ScannerPage />);
		const page = container.querySelector('[data-slot="scanner-page"]');

		expect(page).toHaveClass(
			'overflow-y-auto',
			'overscroll-contain',
			'touch-pan-y',
		);
	});
});
