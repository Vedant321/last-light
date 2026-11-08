FROM node:22-bookworm-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
COPY shared ./shared
COPY tests ./tests
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir uv==0.13.0
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY backend ./backend
COPY shared ./shared
COPY --from=frontend /app/dist ./dist
ENV HOST=0.0.0.0 PORT=3001 DATABASE_PATH=/data/last-light.sqlite3
EXPOSE 3001
VOLUME ["/data"]
CMD ["/app/.venv/bin/python", "-m", "backend"]
