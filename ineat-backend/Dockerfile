FROM node:22-bookworm-slim AS build

WORKDIR /app
RUN corepack enable \
    && apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm prisma generate && pnpm run build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app
RUN corepack enable \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        python3-venv \
        tesseract-ocr \
        tesseract-ocr-fra \
        tesseract-ocr-eng \
        libzbar0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-anonymizer.txt ./
RUN python3 -m venv /opt/anonymizer \
    && /opt/anonymizer/bin/pip install --no-cache-dir -r requirements-anonymizer.txt

ENV PATH="/opt/anonymizer/bin:$PATH"

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml

USER node

CMD ["pnpm", "run", "start:prod"]
