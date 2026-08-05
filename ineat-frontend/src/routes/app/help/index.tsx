import { createFileRoute } from '@tanstack/react-router';
import HelpPage from '@/pages/help/HelpPage';

export const Route = createFileRoute('/app/help/')({
	component: HelpPage,
});
