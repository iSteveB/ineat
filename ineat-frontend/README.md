# InEat Frontend

Application React/Vite de InEat. Elle fournit l'interface utilisateur pour le dashboard, l'inventaire, le budget, les recettes, le profil, les parametres et l'abonnement.

## Stack

- React 19
- TypeScript
- Vite
- TanStack Router
- TanStack Query
- Zustand
- Tailwind CSS v4
- Radix UI
- Zod
- Vitest, Testing Library et MSW

## Installation

```bash
pnpm install
```

## Variables D'environnement

Creer un fichier `.env` dans `ineat-frontend`.

Pour demarrer rapidement:

```bash
cp .env.example .env
```

| Variable | Obligatoire | Usage |
| --- | --- | --- |
| `VITE_API_URL` | Oui | Origine du backend, par exemple `http://localhost:3000` ou `https://api.ineat.store` |

Exemple:

```bash
VITE_API_URL=http://localhost:3000
```

Les services construisent leurs appels directement depuis `${VITE_API_URL}`.

## Lancement

Serveur de developpement:

```bash
pnpm run dev
```

Par defaut, Vite ecoute sur `http://localhost:5173`.

Preview de build:

```bash
pnpm run build
pnpm run preview
```

## Commandes

```bash
pnpm run dev        # serveur Vite
pnpm run build      # typecheck + build production
pnpm run lint       # ESLint
pnpm run test       # Vitest watch
pnpm run test:run   # Vitest one-shot
pnpm run test:ui    # UI Vitest
pnpm run coverage   # couverture
pnpm run preview    # preview du build
```

## Architecture

Repertoires principaux:

| Dossier | Role |
| --- | --- |
| `src/routes` | Routes TanStack Router fichier par fichier |
| `src/pages` | Pages ecran reutilisees par les routes |
| `src/features` | Composants metier par domaine |
| `src/components` | Composants UI, auth et layout |
| `src/services` | Clients API et integrations externes |
| `src/stores` | Stores Zustand |
| `src/schemas` | Types et schemas Zod |
| `src/hooks` | Hooks applicatifs |
| `src/lib` | Utilitaires transverses |
| `src/test` | Setup tests et mocks MSW |

## Routes

Routes publiques:

- `/`
- `/login`
- `/register`
- `/forgot-password`
- `/callback`

Routes protegees sous `/app`:

- `/app` dashboard
- `/app/inventory`
- `/app/inventory/:productId`
- `/app/inventory/add`
- `/app/inventory/add/manual`
- `/app/inventory/add/search`
- `/app/inventory/add/scan`
- `/app/inventory/add/drive`
- `/app/budget`
- `/app/recipes`
- `/app/recipes/:recipeId`
- `/app/recipes/suggestions`
- `/app/notifications`
- `/app/profile`
- `/app/settings`
- `/app/settings/personal-info`
- `/app/settings/diet-restrictions`
- `/app/settings/security`
- `/app/subscription`

La route parente `/app` verifie l'authentification et redirige vers `/login` si la session est absente ou expiree.

## Donnees Et Etat

- `TanStack Query` gere les requetes serveur et le cache.
- `Zustand` gere les etats globaux: auth, inventaire, budget, navigation.
- `api-client.ts` fournit un client JSON commun avec cookies (`credentials: include`).
- Les schemas Zod normalisent les donnees metier recues du backend.

## HTTPS Local

En developpement, Vite essaie de charger:

- `~/localhost+3-key.pem`
- `~/localhost+3.pem`

Si les certificats ne sont pas presents, Vite demarre en HTTP.

## Tests

Les tests utilisent Vitest, Testing Library et MSW:

```bash
pnpm run test:run
```

Le setup global est dans `src/test/setup.ts`; les handlers MSW sont dans `src/test/mocks`.
