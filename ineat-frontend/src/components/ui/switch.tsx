import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

const Switch = React.forwardRef<
	React.ComponentRef<typeof SwitchPrimitive.Root>,
	React.ComponentProps<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
	<SwitchPrimitive.Root
		className={cn(
			// Base styles - plus grand et plus visible
			'peer inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
			// Focus states
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
			// Disabled state
			'disabled:cursor-not-allowed disabled:opacity-50',
			// Unchecked state - gris plus visible
			'data-[state=unchecked]:bg-neutral-100 data-[state=unchecked]:border-neutral-400',
			// Checked state - couleur success du design system
			'data-[state=checked]:bg-accent-600 data-[state=checked]:border-accent-600',
			// Hover effects
			'hover:data-[state=unchecked]:bg-neutral-900 hover:data-[state=checked]:bg-accent-600',
			// Shadow for depth
			'shadow-sm hover:shadow-md transition-all duration-200',
			className
		)}
		{...props}
		ref={ref}>
		<SwitchPrimitive.Thumb
			className={cn(
				// Base thumb styles - plus grand et plus visible
				'pointer-events-none block size-4.5 rounded-full shadow-lg ring-0 transition-transform duration-200',
				// Background colors
				'bg-surface border border-neutral-200',
				// Transform states avec plus d'espace
				'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5',
				// Checked state styling
				'data-[state=checked]:bg-surface data-[state=checked]:border-accent-100',
				// Subtle glow effect when checked
				'data-[state=checked]:shadow-accent-600/20'
			)}
		/>
	</SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
