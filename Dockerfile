FROM node:20-slim
RUN npm install -g pnpm@10
WORKDIR /app
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN cd artifacts/new-world && pnpm build
RUN cd artifacts/api-server && pnpm build
ENV NODE_ENV=production
EXPOSE 8080
CMD ["sh", "-c", "cd artifacts/api-server && SERVE_STATIC_PATH=../new-world/dist/public PORT=${PORT:-8080} node --enable-source-maps ./dist/index.mjs"]
