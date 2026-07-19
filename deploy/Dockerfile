# 阶段1: 构建前端 + 编译后端
FROM node:20-alpine AS builder
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖（包含devDependencies，因为前端构建需要 vite/typescript 等）
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# 复制源代码
COPY . .

# 构建前端（Vite 构建）
RUN npm run build -- --mode production

# 编译后端 TypeScript → JavaScript
RUN npx tsc -p tsconfig.server.build.json

# 阶段2: 生产依赖安装
FROM node:20-alpine AS deps-builder
WORKDIR /app

COPY package*.json ./

# 只安装生产依赖
RUN npm ci --omit=dev --legacy-peer-deps || npm install --omit=dev --legacy-peer-deps

# 阶段3: 生产镜像
FROM node:20-alpine AS production
WORKDIR /app

# 安装 curl 用于健康检查
RUN apk add --no-cache curl

# 复制构建的前端文件
COPY --from=builder /app/dist ./dist

# 复制编译后的后端代码
COPY --from=builder /app/dist-server ./dist-server

# 复制生产依赖（不含 vite/eslint/typescript 等开发依赖）
COPY --from=deps-builder /app/node_modules ./node_modules

# 复制 package.json 供 node 运行时使用
COPY package.json ./

# Environment variables should be injected at runtime via docker-compose or docker run
# Do NOT bake .env files into the image

# 暴露端口
EXPOSE 3001

# 启动应用（用 tsx 运行，支持 ESM 目录导入）
CMD ["npx", "tsx", "dist-server/server/index.js"]
