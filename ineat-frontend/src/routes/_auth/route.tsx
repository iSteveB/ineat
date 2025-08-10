import { createFileRoute, Outlet } from '@tanstack/react-router';
import Logo from '@/components/layout/Logo';

export const Route = createFileRoute('/_auth')({
	component: AuthLayout,
});

export default function AuthLayout() {
	return (
		<div className='min-h-screen flex items-center justify-center p-4'>
			<div className='w-full max-w-md'>
				<div className='text-center mb-8'>
					<div className='flex item-center justify-center'>
						<Logo />
					</div>
					<h1 className='text-3xl font-bold font-fredoka'>InEat</h1>
					<h2 className='text-gray-600'>
						Gérez vos <strong>courses</strong> comme un <strong>chef</strong> !
					</h2>
				</div>
				<Outlet />
			</div>
		</div>
	);
}
