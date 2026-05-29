# InEat Backend

API NestJS de l'application InEat. Elle gere l'authentification, les utilisateurs, l'inventaire alimentaire, les produits, les budgets, les depenses, les avatars et les notifications.

## Stack

- NestJS 10
- Prisma 7 avec PostgreSQL
- Passport, JWT et cookies pour l'authentification
- Google OAuth
- Cloudinary pour le stockage des fichiers
- Swagger en developpement

## Prerequis

- Node.js `>=20`
- pnpm `10.7.0`
- PostgreSQL accessible via `DATABASE_URL`

## Installation

```bash
pnpm install
```

Le script `postinstall` lance `prisma generate`; `DATABASE_URL` doit donc etre defini, meme avec une URL PostgreSQL locale.

## Variables D'environnement

Le backend charge `.env.${NODE_ENV}`. En developpement, utiliser `.env.development`.

Pour demarrer rapidement:

```bash
cp .env.example .env.development
```

Puis remplacer les placeholders par les valeurs locales ou les secrets de l'environnement cible.

Variables principales:

| Variable | Obligatoire | Usage |
| --- | --- | --- |
| `NODE_ENV` | Non | `development` par defaut |
| `PORT` | Non | Port HTTP, `3000` par defaut |
| `DATABASE_URL` | Oui | Connexion PostgreSQL Prisma |
| `JWT_SECRET` | Oui | Signature des JWT |
| `JWT_EXPIRES_IN` | Non | Duree de vie JWT, `1d` par defaut |
| `COOKIE_SECRET` | Recommande | Signature des cookies; fallback sur `JWT_SECRET` |
| `FRONTEND_URL` | Production | Origine frontend autorisee en prod |
| `CORS_ORIGIN` | Production | Origine CORS supplementaire |
| `CLIENT_URL` | OAuth | URL frontend de redirection OAuth |
| `GOOGLE_CLIENT_ID` | OAuth | Client ID Google |
| `GOOGLE_CLIENT_SECRET` | OAuth | Secret Google |
| `GOOGLE_CALLBACK_URL` | OAuth | Callback Google |
| `CLOUDINARY_CLOUD_NAME` | Uploads | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Uploads | Cloudinary API secret |
| `CLOUDINARY_AVATAR_PRESET` | Optionnel | Preset Cloudinary pour avatars |

## Lancement

En developpement:

```bash
pnpm run prisma:migrate
pnpm run dev
```

## API Error Responses

All uncaught HTTP errors are normalized by the global exception filter:

```json
{
  "success": false,
  "code": "BAD_REQUEST",
  "message": "Message safe pour l'utilisateur",
  "requestId": "req_..."
}
```

Client-facing messages must be safe and actionable. Technical details such as
provider errors, credentials, stack traces, environment variable names, and raw
dependency messages must stay in backend logs and observability tools. Unknown
or non-public `5xx` errors are returned as `Une erreur est survenue. Veuillez
réessayer.`. If a server error has a deliberately public message, throw an
`HttpException` response object with a stable `code` and safe `message`.

## Sentry

Backend Sentry initialization happens in `src/instrument.ts`, imported before the
Nest application bootstraps. Configure it with environment variables:

```bash
SENTRY_DSN=
SENTRY_ENABLE_LOGS=true
SENTRY_TRACES_SAMPLE_RATE=1.0
SENTRY_PROFILE_SAMPLE_RATE=1.0
SENTRY_SEND_DEFAULT_PII=false
```

Use lower sampling rates in production unless higher volume is intentional. The
default production sampling is conservative, and `sendDefaultPii` is disabled
unless `SENTRY_SEND_DEFAULT_PII=true` is explicitly set. For verification outside
production, call `GET /debug-sentry`; the route throws a test exception and is
hidden in production.

Mode watch:

```bash
pnpm run start:dev
```

Production locale:

```bash
pnpm run build
pnpm run start:prod
```

Production Railway:

```bash
pnpm run deploy:start
```

Cette commande applique `prisma migrate deploy`, puis demarre l'API NestJS.

## Commandes

```bash
pnpm run build              # prisma generate + compilation Nest
pnpm run deploy:start       # migrations prod + demarrage NestJS
pnpm run lint               # ESLint avec fix
pnpm run format             # Prettier sur src et test
pnpm run test               # tests unitaires Jest
pnpm run test:e2e           # tests e2e
pnpm run test:cov           # couverture
pnpm run prisma:generate    # generation client Prisma
pnpm run prisma:migrate     # migrations dev
pnpm run prisma:migrate:prod
pnpm run prisma:seed
pnpm run prisma:reset
```

Pour verifier un build sans base locale disponible, une URL PostgreSQL syntaxiquement valide suffit pour `prisma generate`:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/ineat pnpm run build
```

## API

Les routes sont prefixees par `/api`, sauf `/health`.

En developpement:

- Swagger: `/docs`
- Health check: `/health`
- Observabilite admin: `/health/observability`

Modules principaux:

| Module | Role |
| --- | --- |
| `AuthModule` | Register, login, logout, JWT, Google OAuth, guards |
| `UserModule` | Profil, informations personnelles, restrictions alimentaires |
| `AvatarModule` | Upload et gestion d'avatar |
| `CloudinaryModule` | Integration Cloudinary |
| `InventoryModule` | Stock utilisateur, ajout manuel, quick add, filtres |
| `ProductsModule` | Recherche produits et categories |
| `BudgetModule` | Budgets mensuels et depenses |
| `PrismaModule` | Acces base de donnees |

## Observabilite Production

Le backend expose un snapshot d'observabilite sur `GET /health/observability`.
La route est protegee par `JwtAuthGuard` et `AdminGuard`; elle doit etre utilisee
avec un compte `ADMIN`.

Le snapshot contient:

- `counters`: compteurs d'evenements par flux critique.
- `timings`: durees min/max/moyenne et dernier contexte pour les traitements.
- `recentEvents`: derniers evenements critiques, avec contexte sanitize.

Signaux a surveiller en priorite:

- `auth.login.failure`: hausse anormale des echecs de connexion.

Les contextes exposent des identifiants utiles (`userId`, etc.) sans secrets.
Les cles sensibles (`password`, `token`, `secret`, `cookie`, `authorization`,
`apiKey`, etc.) sont remplacees par `[redacted]`.

## Base De Donnees

Les modeles Prisma centraux sont:

- `User`
- `Product`
- `InventoryItem`
- `Budget`
- `Expense`
- `Recipe`
- `RecipeIngredient`
- `Notification`
- `Category`

Le schema se trouve dans `prisma/schema.prisma`.

## Developpement Local HTTPS

En developpement, le backend essaie de charger:

- `~/.cert/localhost+2-key.pem`
- `~/.cert/localhost+2.pem`

Si les certificats ne sont pas presents, le serveur demarre en HTTP.
