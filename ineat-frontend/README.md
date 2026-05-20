# InEat Frontend

Application React/Vite de InEat. Elle fournit l'interface utilisateur pour le dashboard, l'inventaire, les tickets de caisse, le budget, les recettes, le profil, les parametres et l'abonnement.

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

| Variable | Obligatoire | Usage |
| --- | --- | --- |
| `VITE_API_URL` | Oui | URL du backend sans suffixe `/api`, par exemple `http://localhost:3000` |

Exemple:

```bash
VITE_API_URL=http://localhost:3000
```

Les services construisent ensuite leurs appels avec `${VITE_API_URL}/api`.

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
- `/app/inventory/add/receipt`
- `/app/inventory/add/drive`
- `/app/budget`
- `/app/receipt`
- `/app/receipt/:receiptId/results`
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
- `Zustand` gere les etats globaux: auth, inventaire, budget, receipt, navigation.
- `api-client.ts` fournit un client JSON commun avec cookies (`credentials: include`).
- `receiptService.ts` utilise aussi `fetch` directement pour les uploads `FormData`.
- Les schemas Zod normalisent les donnees metier recues du backend.

## Flux Ticket Cote Frontend

1. L'utilisateur importe une photo de ticket.
2. `receiptService.uploadReceipt` envoie un `FormData` a `/api/receipt/upload`.
3. Le store receipt garde le `receiptId`.
4. Le frontend poll `/api/receipt/:id/status`.
5. Quand le traitement est termine, il charge `/api/receipt/:id/analysis`.
6. L'utilisateur valide, ignore ou corrige les produits.
7. Les produits valides sont envoyes a l'API pour ajout a l'inventaire.

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
