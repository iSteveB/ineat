// src/test/utils.tsx
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Ici vous pourriez ajouter tous vos providers nécessaires
// Par exemple, si vous avez un ThemeProvider, Router, etc.
// eslint-disable-next-line react-refresh/only-export-components
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
	return (
		<>
			{/* Ajoutez ici vos providers */}
			{children}
		</>
	);
};

const customRender = (
	ui: ReactElement,
	options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Ré-exporter tout de React Testing Library
// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react';
export { customRender as render };
