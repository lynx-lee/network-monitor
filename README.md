# 网络监控系统 (Network Monitor)

## 项目概述

网络监控系统是一个基于现代Web技术构建的实时网络设备监控平台，旨在为网络管理员提供直观、高效的网络管理解决方案。系统通过可视化方式展示网络设备的连接关系、实时状态和流量数据，支持跨设备访问，可通过浏览器实时查看网络拓扑和设备状态。

该系统采用前后端分离架构，前端基于React 19和TypeScript开发，提供流畅的用户体验；后端基于Node.js 22和Express构建，结合WebSocket技术实现实时数据推送；数据库使用MySQL 8存储设备信息和配置数据。整个系统通过Docker容器化部署，确保了良好的可扩展性和可维护性。

## 核心价值

- 🎯 **可视化管理**：直观展示复杂网络拓扑结构，支持设备状态实时可视化
- ⚡ **实时监控**：基于WebSocket技术实现设备状态、连接状态和告警信息的实时推送
- 🚨 **智能告警**：支持设备离线、延迟过高、流量异常等多种告警类型，提供实时通知机制
- 📊 **数据分析**：提供设备性能指标和流量数据统计，支持历史数据查询和趋势分析
- 💻 **跨平台访问**：支持Chrome、Firefox、Safari等主流浏览器，兼容桌面和移动设备
- 📱 **响应式设计**：自适应不同屏幕尺寸，提供良好的移动端访问体验
- 🔧 **灵活配置**：支持设备配置、告警阈值配置、系统参数配置等多种配置选项
- 🔒 **稳定可靠**：采用容器化部署，具备良好的容错能力和可靠性
- 🚀 **高性能**：经过优化的画布渲染和拖拽体验，支持大规模设备网络的流畅展示

## 架构设计

### 系统架构

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               客户端 (Browser)                                  │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────────┤
│   React 19 +    │    Socket.io    │     Axios       │      WebSocket            │
│   TypeScript    │     Client      │    HTTP Client  │        Client             │
└─────────────────┴─────────────────┴─────────────────┴───────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               Nginx 反向代理                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  - 静态资源服务                                                                │
│  - API请求代理                                                                │
│  - WebSocket连接代理                                                          │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               │                                         │
               ▼                                         ▼
┌───────────────────────────┐             ┌───────────────────────────┐
│       后端服务            │             │        前端构建产物        │
├───────────────────────────┤             ├───────────────────────────┤
│  - Node.js 22 + Express   │             │  - Vite 构建输出           │
│  - TypeScript 5           │             │  - React 组件             │
│  - Socket.io Server       │             │  - 静态资源               │
│  - MySQL 8 数据库         │             │                           │
│  - Zustand 状态管理       │             │                           │
└───────────────────────────┘             └───────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               MySQL 数据库                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  - 设备信息表 (devices)        │ 设备基本信息、状态、性能指标                  │
│  - 连接信息表 (connections)     │ 设备间连接关系、带宽、状态                    │
│  - 配置信息表 (config)          │ 系统配置、告警阈值、用户偏好                  │
│  - 告警信息表 (alerts)          │ 告警历史记录、状态、处理情况                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 核心组件

1. **前端组件**
   - `NetworkCanvas`: 网络拓扑可视化组件，支持拖拽、缩放和设备连接
   - `Sidebar`: 侧边栏导航组件，用于添加设备和系统配置
   - `DeviceConfigPanel`: 设备配置面板，用于编辑设备信息
   - `ConfigPanel`: 系统配置面板，用于调整系统参数
   - `AlertPanel`: 告警信息面板，展示实时告警和历史记录

2. **后端组件**
   - `deviceService`: 设备管理服务，处理设备的增删改查
   - `connectionService`: 连接管理服务，处理设备间连接关系
   - `configService`: 配置管理服务，处理系统配置
   - `alertService`: 告警管理服务，处理告警的生成和发送
   - `websocketService`: WebSocket服务，实现实时数据推送
   - `loggerService`: 日志服务，记录系统运行日志

3. **状态管理**
   - `networkStore`: 网络设备和连接状态管理
   - `configStore`: 系统配置管理

## 技术栈

### 前端技术栈

| 技术/框架       | 版本  | 用途                     |
|---------------|-----|------------------------|
| React         | 19.2.0 | 前端框架                   |
| React DOM     | 19.2.0 | DOM操作库                 |
| TypeScript    | 5.9.3 | 类型系统                   |
| Vite          | 5.4.21 | 构建工具                   |
| Ant Design    | 6.1.2 | UI组件库                  |
| Ant Design Icons | 6.1.0 | 图标库                  |
| React Flow    | 11.11.4 | 网络拓扑图绘制                |
| Zustand       | 5.0.9 | 状态管理                   |
| zustand-persist | 0.4.0 | Zustand持久化插件         |
| Socket.io Client | 4.8.3 | WebSocket客户端           |
| Axios         | 1.13.2 | HTTP请求客户端              |
| i18next       | 25.7.3 | 国际化支持                 |
| react-i18next | 16.5.0 | React国际化组件           |
| Recharts      | 3.6.0 | 图表库                   |

### 后端技术栈

| 技术/框架       | 版本  | 用途                     |
|---------------|-----|------------------------|
| Node.js       | 22+ | 运行时环境                 |
| Express       | 4+  | Web框架                  |
| TypeScript    | 5+  | 类型系统                   |
| Socket.io     | 4+  | WebSocket服务端           |
| MySQL         | 8.0 | 数据库                   |
| mysql2        | 3+  | MySQL驱动                |
| dotenv        | 16+ | 环境变量管理                 |
| winston       | 3+  | 日志管理                  |

### 部署技术栈

| 技术/工具       | 版本  | 用途                     |
|---------------|-----|------------------------|
| Docker        | 20+ | 容器化平台                 |
| Docker Compose | 2+  | 多容器编排工具               |
| Nginx         | 1.29+ | Web服务器和反向代理           |

## 核心功能

### 1. 网络拓扑可视化
- ✅ 实时展示设备连接关系
- ✅ 设备状态动态更新（在线/离线/告警）
- ✅ 支持拖拽调整设备位置
- ✅ 支持缩放和移动视图
- ✅ 支持设备分组和分层展示

### 2. 设备管理
- ✅ 设备添加、编辑、删除
- ✅ 设备状态监控（在线/离线）
- ✅ 设备端口管理
- ✅ 设备流量监控
- ✅ 设备性能指标展示

### 3. 实时数据更新
- ✅ WebSocket实时推送设备状态
- ✅ 设备状态变化即时通知
- ✅ 流量数据实时更新
- ✅ 连接状态实时监控

### 4. 告警系统
- ✅ 设备状态告警（离线/延迟过高）
- ✅ 流量异常告警
- ✅ 告警阈值配置
- ✅ 告警历史记录
- ✅ 告警通知机制

### 5. 配置管理
- ✅ 系统配置（语言、主题等）
- ✅ 告警配置
- ✅ 设备配置模板
- ✅ 配置备份和恢复

### 6. 跨设备访问
- ✅ 支持多种浏览器（Chrome、Firefox、Safari等）
- ✅ 支持桌面和移动设备
- ✅ 响应式设计
- ✅ 自适应布局

## 性能优化

### 1. 画布性能优化
- 🚀 **虚拟列表渲染**：使用 `VirtualizedNodeList` 组件实现节点的虚拟渲染，只渲染可视区域内的设备节点
- 🚀 **优化的节点组件**：`OptimizedNetworkDeviceNode` 采用更高效的渲染逻辑，减少不必要的重渲染
- 🚀 **缓存机制**：使用 `useMemo` 缓存节点和边的数据，避免重复计算
- 🚀 **批量更新**：对节点位置更新进行批量处理，减少渲染次数

### 2. 拖拽性能优化
- 🚀 **节流机制**：实现了 `useDragOptimization` hook，采用 100ms 节流机制优化拖拽体验
- 🚀 **平滑过渡**：添加了设备节点的平滑过渡效果，提升拖拽过程的视觉体验
- 🚀 **批量处理**：拖拽结束后才更新设备位置，减少实时更新带来的性能开销
- 🚀 **改进的视觉反馈**：拖拽时显示清晰的选中状态和拖拽提示

### 3. WebSocket优化
- 🚀 **连接稳定性**：增强了WebSocket连接的稳定性，实现自动重连机制
- 🚀 **增量更新**：采用增量更新策略，只传输变化的数据，减少网络带宽消耗
- 🚀 **消息压缩**：对传输的消息进行压缩处理，进一步减少数据传输量
- 🚀 **事件限流**：对高频事件进行限流处理，避免服务器和客户端过载

### 4. 组件性能优化
- 🚀 **侧边栏优化**：`Sidebar` 组件采用固定宽度和优化的过渡动画，提升交互体验
- 🚀 **错误边界**：添加 `ErrorBoundary` 组件，防止单个组件错误影响整个应用
- 🚀 **延迟加载**：对非关键组件实现延迟加载，减少初始加载时间
- 🚀 **CSS优化**：优化CSS选择器和样式，减少浏览器渲染开销

### 5. 网络请求优化
- 🚀 **缓存机制**：添加5秒缓存机制，减少重复API请求
- 🚀 **请求重试**：实现API请求重试机制（3次重试，1秒延迟），提高请求成功率
- 🚀 **批量请求**：对多个相关请求进行批量处理，减少HTTP连接数
- 🚀 **类型安全封装**：创建类型安全的API请求封装，减少运行时错误

### 6. 构建优化
- 🚀 **依赖优化**：优化项目依赖，减少打包体积
- 🚀 **代码分割**：实现代码分割，按需加载模块
- 🚀 **Tree Shaking**：启用Tree Shaking，移除未使用的代码
- 🚀 **构建缓存**：使用Vite构建缓存，加速开发构建过程

## 快速开始

### 环境要求

- Node.js 22+
- Docker 20+
- Docker Compose 2+

### 开发环境运行

#### 1. 安装依赖

```bash
# 安装项目依赖
npm install
```

#### 2. 配置环境变量

创建 `.env` 文件，根据需要修改配置：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=network_monitor

# 服务器配置
SERVER_PORT=3001
CLIENT_ORIGIN=http://localhost:5173

# 日志配置
LOG_LEVEL=debug

# 前端配置
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=http://localhost:3001
```

#### 3. 启动开发服务器

```bash
# 启动前端开发服务器
npm run dev

# 启动后端开发服务器
npm run server
```

#### 4. 访问应用

- 前端访问地址：`http://localhost:5173`
- 后端API地址：`http://localhost:3001/api`
- API文档：`http://localhost:3001/api-docs`

### 生产环境部署

#### 1. 使用Docker Compose部署（推荐）

**准备工作**：
- 确保已安装Docker和Docker Compose
- 确保当前用户有权限运行Docker命令

**部署步骤**：

```bash
# 1. 复制并配置环境变量
cp .env.example .env
# 根据实际环境修改.env文件中的配置

# 2. 构建并启动服务
docker-compose up -d --build
```

**服务访问**：

- 前端访问地址：`http://localhost:8090`
- 后端API地址：`http://localhost:3001/api`
- 测试页面：`http://localhost:8090/test-config-load.html`

**常用命令**：

```bash
# 停止服务
docker-compose down

# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f

# 重启服务
docker-compose restart
```

#### 2. 手动部署

**前端部署**：

```bash
# 1. 构建前端
npm run build

# 2. 将构建产物部署到Web服务器（如Nginx）
# 将dist目录下的文件复制到Nginx的html目录
```

**后端部署**：

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 根据实际环境修改.env文件中的配置

# 3. 启动后端服务
npm run server
```

**Nginx配置示例**：

```nginx
server {
    listen 80;
    server_name example.com;

    # 前端静态资源
    location / {
        root /path/to/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端API代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket代理
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 开发流程

### 代码规范

- 遵循TypeScript编码规范
- 使用ESLint进行代码检查
- 使用Prettier进行代码格式化
- 遵循React最佳实践
- 组件命名使用PascalCase
- 函数命名使用camelCase

### 提交规范

- 使用Conventional Commits规范
- 提交信息格式：`type(scope): description`
- 示例：`feat(network): add device status monitoring`
- 支持的type：feat（新功能）、fix（修复）、docs（文档）、style（样式）、refactor（重构）、test（测试）、chore（构建过程或辅助工具的变动）

### 测试

- **API测试**：使用bash脚本测试所有API端点
  ```bash
  ./test_api.sh
  ```

- **TypeScript类型检查**：
  ```bash
  npx tsc --noEmit
  ```

- **单元测试**：使用Vitest进行单元测试
  ```bash
  npm test
  ```

- **单元测试（监听模式）**：
  ```bash
  npm run test:watch
  ```

- **单元测试（覆盖率报告）**：
  ```bash
  npm run test:coverage
  ```

- **构建测试**：
  ```bash
  npm run build
  ```

- **启动所有服务**：同时启动前后端开发服务器
  ```bash
  npm start
  ```

## 项目结构

```
├── src/
│   ├── components/             # React组件
│   │   ├── NetworkCanvas.tsx           # 网络拓扑可视化组件
│   │   ├── NetworkDeviceNode.tsx       # 网络设备节点组件
│   │   ├── OptimizedNetworkCanvas.tsx  # 优化版网络拓扑组件
│   │   ├── OptimizedNetworkDeviceNode.tsx  # 优化版设备节点组件
│   │   ├── Sidebar.tsx                 # 侧边栏导航组件
│   │   ├── DeviceConfigPanel.tsx       # 设备配置面板
│   │   ├── ConfigPanel.tsx             # 系统配置面板
│   │   ├── AlertPanel.tsx              # 告警信息面板
│   │   ├── ErrorBoundary.tsx           # 错误边界组件
│   │   ├── LanguageSwitcher.tsx        # 语言切换组件
│   │   └── VirtualizedNodeList.tsx     # 虚拟节点列表组件
│   ├── hooks/                  # 自定义React hooks
│   │   └── useDragOptimization.ts      # 拖拽优化hook
│   ├── store/                  # Zustand状态管理
│   │   ├── networkStore.ts     # 网络设备和连接状态管理
│   │   └── configStore.ts      # 系统配置管理
│   ├── services/               # 服务层
│   │   ├── websocketService.ts # WebSocket服务
│   │   ├── loggerService.ts    # 日志服务
│   │   └── apiService.ts       # API请求服务
│   ├── types/                  # TypeScript类型定义
│   │   └── index.ts            # 所有类型定义
│   ├── server/                 # 后端代码
│   │   ├── services/           # 后端服务
│   │   │   ├── deviceService.ts      # 设备管理服务
│   │   │   ├── connectionService.ts  # 连接管理服务
│   │   │   ├── configService.ts      # 配置管理服务
│   │   │   ├── alertService.ts       # 告警管理服务
│   │   │   └── websocketService.ts   # WebSocket服务
│   │   ├── index.ts            # 后端入口文件
│   │   └── config/             # 后端配置
│   ├── test/                   # 测试文件
│   ├── assets/                 # 静态资源
│   ├── config/                 # 通用配置
│   ├── i18n/                   # 国际化配置
│   ├── utils/                  # 工具函数
│   ├── App.tsx                 # 应用入口组件
│   ├── App.css                 # 应用样式
│   ├── main.tsx                # 应用入口文件
│   └── index.css               # 全局样式
├── public/                     # 静态资源
├── docker-compose.yml          # Docker Compose配置
├── Dockerfile                  # 后端Dockerfile
├── Dockerfile.frontend         # 前端Dockerfile
├── nginx.conf                  # Nginx配置
├── mysql-init.sql              # MySQL初始化脚本
├── mysql-init-optimized.sql    # 优化版MySQL初始化脚本
├── test_api.sh                 # API测试脚本
├── test-alert.ts               # 告警测试脚本
├── test-config-load.html       # 配置加载测试页面
├── API_DOCUMENTATION.md        # API文档
├── CANVAS_OPTIMIZATION.md      # 画布优化文档
├── OPTIMIZATION_REPORT.md      # 优化报告
├── OPTIMIZATION_REPORT_FINAL.md # 最终优化报告
├── package.json                # 项目配置
├── tsconfig.json               # TypeScript配置
├── tsconfig.app.json           # TypeScript应用配置
├── tsconfig.node.json          # TypeScript Node配置
├── vite.config.ts              # Vite配置
├── vitest.config.ts            # Vitest配置
└── README.md                   # 项目文档
```

## 配置说明

### 环境变量配置

#### 前端环境变量

| 变量名          | 默认值                | 用途                     |
|---------------|--------------------|------------------------|
| VITE_API_URL  | http://localhost:3001/api | API基础URL           |
| VITE_WS_URL   | http://localhost:3001 | WebSocket基础URL     |
| VITE_CLIENT_PORT | 5173               | 客户端端口                 |
| VITE_CLIENT_HOST | localhost          | 客户端主机                 |

#### 后端环境变量

| 变量名          | 默认值                | 用途                     |
|---------------|--------------------|------------------------|
| DB_HOST       | localhost          | 数据库主机                 |
| DB_PORT       | 3306               | 数据库端口                 |
| DB_USER       | root               | 数据库用户名                |
| DB_PASSWORD   | password           | 数据库密码                 |
| DB_NAME       | network_monitor    | 数据库名称                 |
| SERVER_PORT   | 3001               | 服务器端口                 |
| CLIENT_ORIGIN | http://localhost:5173 | 允许的客户端来源             |
| LOG_LEVEL     | debug              | 日志级别                  |

### 配置文件

1. **客户端配置**：`src/config/index.ts`
2. **后端配置**：`src/server/config/index.ts`
3. **数据库配置**：`docker-compose.yml`中的环境变量

## API文档

### 基础URL

所有API端点的基础URL为：`/api`

### 主要API端点

#### 设备管理

| 方法 | 端点 | 描述 |
|-----|-----|-----|
| GET | /devices | 获取所有设备信息 |
| POST | /devices | 保存设备信息 |
| DELETE | /devices/:id | 删除设备 |

#### 连接管理

| 方法 | 端点 | 描述 |
|-----|-----|-----|
| GET | /connections | 获取所有连接信息 |
| POST | /connections | 保存连接信息 |
| DELETE | /connections/:id | 删除连接 |

#### 配置管理

| 方法 | 端点 | 描述 |
|-----|-----|-----|
| GET | /config | 获取所有配置 |
| GET | /config/:key | 获取单个配置 |
| POST | /config | 更新配置 |

#### 告警管理

| 方法 | 端点 | 描述 |
|-----|-----|-----|
| GET | /alerts | 获取所有告警信息 |
| GET | /alerts/:deviceId | 获取设备告警信息 |
| POST | /alerts | 创建新告警 |
| GET | /alerts/settings | 获取所有设备告警设置 |
| GET | /alerts/settings/:deviceId | 获取设备告警设置 |
| POST | /alerts/settings/:deviceId | 更新设备告警设置 |

#### 健康检查

| 方法 | 端点 | 描述 |
|-----|-----|-----|
| GET | /health | 检查服务健康状态 |

### WebSocket API

#### 事件

| 事件名 | 描述 | 数据格式 |
|-------|-----|--------|
| deviceUpdate | 设备状态更新 | `Array<Device>` |
| connectionUpdate | 连接状态更新 | `Array<Connection>` |
| alert | 告警信息 | `Alert` |

## 监控与维护

### 日志管理

- 日志文件路径：`logs/network-monitor-YYYY-MM-DD.log`
- 日志级别：debug、info、warn、error
- 支持按日期自动切割

### 常见问题排查

1. **前端无法连接后端**
   - 检查环境变量 `VITE_API_URL` 和 `VITE_WS_URL` 是否正确
   - 检查后端服务是否正常运行
   - 检查防火墙设置

2. **WebSocket连接失败**
   - 检查 `VITE_WS_URL` 配置
   - 检查后端WebSocket服务是否正常
   - 检查Nginx配置是否正确代理WebSocket请求

3. **数据库连接失败**
   - 检查数据库服务是否正常运行
   - 检查数据库配置是否正确
   - 检查数据库用户权限

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 联系方式

- 项目地址: https://github.com/yourusername/network-monitor
- 问题反馈: https://github.com/yourusername/network-monitor/issues
- 讨论交流: https://github.com/yourusername/network-monitor/discussions

## 更新日志

### v1.0.1 (2026-01-12)

#### 性能优化
- 添加5秒缓存机制，减少重复API请求
- 实现API请求重试机制（3次重试，1秒延迟）
- 实现设备增量更新，减少网络传输数据量
- 优化WebSocket连接配置
- 优化构建流程，跳过不必要的TypeScript编译

#### 代码改进
- 创建统一的日志服务，支持不同日志级别
- 重构状态管理，减少代码冗余
- 修复多个TypeScript类型错误
- 改进错误处理机制
- 添加类型安全的API请求封装

#### 可靠性提升
- 增强WebSocket连接稳定性
- 改进设备状态更新逻辑
- 优化数据库查询性能
- 添加健康检查端点

### v1.0.0 (2025-12-31)

- 初始版本发布
- 实现网络拓扑可视化
- 支持设备状态实时监控
- 支持跨设备访问
- 实现告警系统
- 支持系统配置管理

## 致谢

- React Flow 团队提供的网络拓扑图组件
- Ant Design 团队提供的UI组件库
- Socket.io 团队提供的实时通信解决方案
- 所有为项目做出贡献的开发者

---

**网络监控系统** - 让网络管理更简单、更直观！

*Last updated: 2026-01-16*