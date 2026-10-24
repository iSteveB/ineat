import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import { FC } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BudgetAlert } from '@/schemas';

interface BudgetAlertsProps {
	alerts: BudgetAlert[];
}

const SEVERITY = {
	CRITICAL: { variant: 'error', icon: CircleAlert },
	WARNING: { variant: 'warning', icon: TriangleAlert },
	INFO: { variant: 'info', icon: Info },
} as const;

const BudgetAlerts: FC<BudgetAlertsProps> = ({ alerts }) => {
	if (alerts.length === 0) return null;

	return (
		<div className='flex flex-col gap-3'>
			{alerts.map((alert) => {
				const { variant, icon: Icon } = SEVERITY[alert.severity] ?? SEVERITY.INFO;

				return (
					<Alert key={alert.id} variant={variant} role='status'>
						<Icon aria-hidden='true' />
						<AlertTitle>{alert.title}</AlertTitle>
						<AlertDescription>
							<p>{alert.message}</p>
							{alert.suggestions && alert.suggestions.length > 0 && (
								<ul className='mt-1 list-disc pl-5'>
									{alert.suggestions.map((suggestion) => (
										<li key={suggestion}>{suggestion}</li>
									))}
								</ul>
							)}
						</AlertDescription>
					</Alert>
				);
			})}
		</div>
	);
};

export default BudgetAlerts;
