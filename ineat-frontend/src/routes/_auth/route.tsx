import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth')({
  component: AuthLayout,
});

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">InEat</h1>
          <p className="text-gray-600">Gérez votre inventaire alimentaire efficacement</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
};