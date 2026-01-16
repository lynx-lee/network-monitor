# 阶段1: 构建前端
FROM node:22-alpine AS frontend-builder
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖（包含devDependencies，因为前端构建可能需要）
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# 复制源代码
COPY . .

# 构建前端（跳过TypeScript编译，直接运行Vite构建，因为Vite会自动进行TypeScript检查）
RUN npm run build -- --mode production

# 阶段2: 构建后端（关键修改：安装所有依赖，包括tsx）
FROM node:22-alpine AS backend-builder
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 🔥 移除 --only=production，安装所有依赖（包括tsx）
# 原因：tsx 是运行TS代码的必需依赖，生产环境也需要
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# 复制源代码
COPY . .

# 可选：预编译TS为JS（推荐，彻底摆脱tsx依赖）
RUN npm run build --filter=backend || echo "Backend build skipped (继续使用tsx运行)"

# 阶段3: 生产镜像
FROM node:22-alpine AS production
WORKDIR /app

# 安装curl用于健康检查
RUN apk add --no-cache curl bash

# 复制构建的前端文件
COPY --from=frontend-builder /app/dist ./dist

# 复制后端依赖和代码（包含tsx）
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/src ./src
COPY --from=backend-builder /app/package.json ./
COPY --from=backend-builder /app/tsconfig.json ./
COPY --from=backend-builder /app/tsconfig.node.json ./
COPY --from=backend-builder /app/.env ./

# 如果没有.env文件，创建一个默认的
RUN if [ ! -f .env ]; then echo "DB_HOST=db\nDB_PORT=3306\nDB_USER=network_monitor\nDB_PASSWORD=network_monitor_password\nDB_NAME=network_monitor\nPORT=3001\nCLIENT_ORIGIN=http://localhost:3001\nNODE_ENV=production\nVITE_API_URL=http://localhost:3001/api\nVITE_WS_URL=ws://localhost:3001" > .env; fi

# 暴露端口
EXPOSE 3001

# 启动应用（使用npm run server，避免tsx路径问题）
CMD ["npm", "run", "server"]
# 若用方案2，可保留原命令：CMD ["npm", "run", "server"]