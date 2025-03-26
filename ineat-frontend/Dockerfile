# Étape de construction
FROM node:18-alpine AS builder

# Installation de pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Définition du répertoire de travail
WORKDIR /app

# Copie des fichiers de configuration
COPY package.json pnpm-lock.yaml* ./

# Installation des dépendances
RUN pnpm install --frozen-lockfile

# Copie du code source
COPY . .

# Construction de l'application
RUN pnpm build

# Étape de production
FROM nginx:alpine AS production

# Copie des fichiers de build dans le répertoire de service nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copie de la configuration nginx personnalisée (à créer si nécessaire)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Port sur lequel l'application sera exposée
EXPOSE 80

# Commande de démarrage
CMD ["nginx", "-g", "daemon off;"]