# 阶段1: 构建前端
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖（包含devDependencies，因为前端构建需要 vite/typescript 等）
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# 复制源代码
COPY . .

# 构建前端（Vite 构建）
RUN npm run build -- --mode production

# 阶段2: 生产依赖安装
FROM node:20-alpine AS deps-builder
WORKDIR /app

COPY package*.json ./

# 只安装生产依赖
RUN npm ci --omit=dev --legacy-peer-deps || npm install --omit=dev --legacy-peer-deps

# tsx 是运行时必需的（运行 TS 后端），但属于 devDependencies
# 单独安装到生产 node_modules 中
RUN npm install tsx@4 --legacy-peer-deps --no-save

# 阶段3: 生产镜像
FROM node:20-alpine AS production
WORKDIR /app

# 安装 curl 用于健康检查
RUN apk add --no-cache curl

# 复制构建的前端文件
COPY --from=frontend-builder /app/dist ./dist

# 复制生产依赖（不含 vite/eslint/typescript 等开发依赖）
COPY --from=deps-builder /app/node_modules ./node_modules

# 复制后端代码和必要配置
COPY server ./server
COPY types ./types
COPY package.json ./
COPY tsconfig.json ./
COPY tsconfig.server.json ./

# Environment variables should be injected at runtime via docker-compose or docker run
# Do NOT bake .env files into the image

# 暴露端口
EXPOSE 3001

# 启动应用
CMD ["npm", "run", "server"]
