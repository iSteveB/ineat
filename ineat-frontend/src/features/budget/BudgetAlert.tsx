import { Alert, AlertDescription } from "@/components/ui/alert";
import { BudgetAlert } from "@/schemas";
import { AlertTriangle } from "lucide-react";
import { FC } from "react";

interface BudgetAlertsProps {
	alerts: BudgetAlert[];
}

const BudgetAlerts: FC<BudgetAlertsProps> = ({ alerts }) => {
	if (alerts.length === 0) return null;

	return (
		<div className='space-y-2'>
			{alerts.map((alert) => (
				<Alert
					key={alert.id}
					variant={
						alert.severity === 'CRITICAL' ? 'warning' : 'default'
					}>
					<AlertTriangle className='size-4' />
					<AlertDescription>
						<strong>{alert.title}</strong>
						<br />
						{alert.message}
						{alert.suggestions && alert.suggestions.length > 0 && (
							<div className='mt-2'>
								<strong>Suggestions:</strong>
								<ul className='list-disc list-inside mt-1'>
									{alert.suggestions.map(
										(suggestion, index) => (
											<li key={index} className='text-sm'>
												{suggestion}
											</li>
										)
									)}
								</ul>
							</div>
						)}
					</AlertDescription>
				</Alert>
			))}
		</div>
	);
};

export default BudgetAlerts;