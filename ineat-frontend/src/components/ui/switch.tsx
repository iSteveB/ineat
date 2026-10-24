import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

/**
 * Interrupteur. Éteint, la piste neutral-400 contraste à 3,2:1 avec le fond (seuil 3:1 des
 * composants d'interface) ; allumé, elle passe en accent-600 et le curseur glisse à droite,
 * l'état ne repose donc pas sur la couleur seule.
 */
const Switch = React.forwardRef<
	React.ComponentRef<typeof SwitchPrimitive.Root>,
	React.ComponentProps<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
	<SwitchPrimitive.Root
		className={cn(
			'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200',
			'focus-visible:outline-ring',
			'disabled:cursor-not-allowed disabled:opacity-50',
			'data-[state=unchecked]:bg-neutral-400 hover:data-[state=unchecked]:bg-neutral-500',
			'data-[state=checked]:bg-accent-600 hover:data-[state=checked]:bg-accent-700',
			className
		)}
		{...props}
		ref={ref}>
		<SwitchPrimitive.Thumb
			className={cn(
				'pointer-events-none block size-5 rounded-full bg-surface shadow-sm transition-transform duration-200',
				'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0'
			)}
		/>
	</SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
