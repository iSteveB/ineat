import { createFileRoute, Outlet, redirect, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/app')({
  beforeLoad: async () => {
    // Vérification de l'authentification - à adapter avec le système d'auth
    const isAuthenticated = localStorage.getItem('auth_token')
    
    if (!isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: window.location.pathname,
        },
      })
    }
  },
  component: AppLayout,
})

function AppLayout() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-4">
        <h1 className="text-xl font-bold mb-8">InEat</h1>
        <nav className="space-y-2">
          <Link to="/app" className="block p-2 rounded hover:bg-gray-700 [&.active]:bg-gray-700">
            Dashboard
          </Link>
          <Link to="/app/inventory" className="block p-2 rounded hover:bg-gray-700 [&.active]:bg-gray-700">
            Stock
          </Link>
          <Link to="/app/recipes" className="block p-2 rounded hover:bg-gray-700 [&.active]:bg-gray-700">
            Recettes
          </Link>
          <Link to="/app/budget" className="block p-2 rounded hover:bg-gray-700 [&.active]:bg-gray-700">
            Budget
          </Link>
        </nav>
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  )
}