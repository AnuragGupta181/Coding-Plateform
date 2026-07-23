# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# CQRS split-host overrides (optional — both fall back to VITE_API_BASE_URL if unset)
ARG VITE_QUERY_BASE_URL
ENV VITE_QUERY_BASE_URL=${VITE_QUERY_BASE_URL}

ARG VITE_COMMAND_BASE_URL
ENV VITE_COMMAND_BASE_URL=${VITE_COMMAND_BASE_URL}

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runner
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
