// src/routes/(auth)/login.tsx
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Connexion</h2>
      <form className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
          <input type="email" id="email" className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">Mot de passe</label>
          <input type="password" id="password" className="w-full px-3 py-2 border rounded-md" />
        </div>
        <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white rounded-md">
          Se connecter
        </button>
      </form>
      <div className="mt-4 text-center">
        <p>
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-blue-600">
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
  )
}