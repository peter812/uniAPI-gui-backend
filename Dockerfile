###############################################
# Stage 1: Build the frontend + bundle server
###############################################
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts tailwind.config.ts postcss.config.js components.json ./
COPY client/ client/
COPY shared/ shared/
COPY server/ server/
COPY script/ script/

RUN npm run build

###############################################
# Stage 2: Production Node.js app
###############################################
FROM node:20-slim AS app

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY shared/ shared/
COPY server/ server/
COPY drizzle.config.ts ./

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "dist/index.cjs"]

###############################################
# Stage 3: UniAPI Python service
###############################################
FROM python:3.11-slim AS uniapi

WORKDIR /app

COPY uniapi-main/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

RUN pip install --no-cache-dir playwright \
    && playwright install --with-deps chromium

COPY uniapi-main/backend/ ./backend/

WORKDIR /app/backend

EXPOSE 8001

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--log-level", "info"]

###############################################
# Stage 4: Bridge servers (Instagram/Facebook)
###############################################
FROM python:3.11-slim AS bridge

WORKDIR /app

COPY uniapi-main/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

RUN pip install --no-cache-dir playwright \
    && playwright install --with-deps chromium

COPY uniapi-main/backend/ ./backend/

ENV PYTHONUNBUFFERED=1
