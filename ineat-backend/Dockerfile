# Étape de construction
FROM node:18-alpine AS builder

# Installation de pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Définition du répertoire de travail
WORKDIR /app

# Copie des fichiers de configuration
COPY package.json pnpm-lock.yaml* ./

# Installation des dépendances en ignorant les scripts de préparation
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copie du code source
COPY . .

# Construction de l'application
RUN pnpm build

# Étape de production
FROM node:18-alpine AS production

# Installation de pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Définition du répertoire de travail
WORKDIR /app

# Copie des fichiers de configuration
COPY package.json pnpm-lock.yaml* ./

# Installation des dépendances de production uniquement
RUN pnpm install --prod --frozen-lockfile

# Copie des fichiers de build depuis l'étape précédente
COPY --from=builder /app/dist ./dist

# Port sur lequel l'API sera exposée
EXPOSE 3000

# Commande de démarrage
CMD ["node", "dist/main"]