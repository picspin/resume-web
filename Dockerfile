FROM node:24-bookworm-slim
WORKDIR /app
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
RUN apt-get update && apt-get install -y --no-install-recommends git gh \
    && npx --no-install playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/*

COPY scripts ./scripts
COPY src ./src
COPY public/images ./public/images
COPY career/config ./career/config
COPY career/data ./career/data
COPY career/modes ./career/modes
COPY career/templates ./career/templates
COPY index.html vite.config.js postcss.config.js tailwind.config.js ./
COPY deploy/empty-versions.json ./src/data/resume-versions.json
COPY deploy/empty-versions.json ./src/data/career-versions.local.json
RUN npm run build:private \
    && mkdir -p career/jobs career/jds career/versions career/output \
    && chown -R node:node /app /ms-playwright

ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
USER node
VOLUME ["/app/career"]
EXPOSE 3000
CMD ["node", "scripts/server/start.mjs"]
