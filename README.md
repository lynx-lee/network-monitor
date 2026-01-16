# 网络监控系统

## 项目介绍

网络监控系统是一个基于Web的实时网络设备监控平台，用于可视化展示网络设备的状态、连接关系和流量数据。系统支持跨设备访问，可通过浏览器实时查看网络拓扑和设备状态。

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               客户端 (Browser)                                  │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────────┤
│   React +       │    Socket.io    │     Axios       │      WebSocket            │
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
│       后端服务            │             │        前端服务           │
├───────────────────────────┤             ├───────────────────────────┤
│  - Node.js + Express      │             │  - React + TypeScript     │
│  - TypeScript             │             │  - Vite                   │
│  - Socket.io Server       │             │  - Ant Design             │
│  - MySQL Database         │             │  - React Flow             │
│  - Zustand (状态管理)     │             │  - Zustand (状态管理)     │
└───────────────────────────┘             └───────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               MySQL 数据库                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  - 设备信息表 (devices)                                                        │
│  - 连接信息表 (connections)                                                     │
│  - 配置信息表 (config)                                                          │
│  - 告警信息表 (alerts)                                                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 核心组件

1. **前端组件**
   - `NetworkCanvas`: 网络拓扑可视化组件
   - `Sidebar`: 侧边栏导航组件
   - `DeviceConfigPanel`: 设备配置面板
   - `ConfigPanel`: 系统配置面板
   - `AlertPanel`: 告警信息面板

2. **后端组件**
   - `deviceService`: 设备管理服务
   - `connectionService`: 连接管理服务
   - `configService`: 配置管理服务
   - `alertService`: 告警管理服务
   - `websocketService`: WebSocket服务
   - `loggerService`: 日志服务

3. **状态管理**
   - `networkStore`: 网络设备和连接状态管理
   - `configStore`: 系统配置管理

## 技术栈

### 前端技术栈

| 技术/框架       | 版本  | 用途                     |
|---------------|-----|------------------------|
| React         | 18+ | 前端框架                   |
| TypeScript    | 5+  | 类型系统                   |
| Vite          | 5+  | 构建工具                   |
| Ant Design    | 5+  | UI组件库                  |
| React Flow    | 11+ | 网络拓扑图绘制                |
| Zustand       | 4+  | 状态管理                   |
| Socket.io Client | 4+ | WebSocket客户端           |
| Axios         | 1+  | HTTP请求客户端              |
| i18next       | 23+ | 国际化支持                 |

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

1. **网络拓扑可视化**
   - 实时展示设备连接关系
   - 设备状态动态更新
   - 支持拖拽调整设备位置
   - 支持缩放和移动视图

2. **设备管理**
   - 设备添加、编辑、删除
   - 设备状态监控
   - 设备端口管理
   - 设备流量监控

3. **实时数据更新**
   - WebSocket实时推送设备状态
   - 设备状态变化即时通知
   - 流量数据实时更新

4. **告警系统**
   - 设备状态告警
   - 延时告警
   - 告警阈值配置
   - 告警历史记录

5. **配置管理**
   - 系统配置
   - 语言设置
   - 主题切换
   - 告警配置

6. **跨设备访问**
   - 支持多种浏览器
   - 支持桌面和移动设备
   - 响应式设计

## 编译和运行指引

### 环境要求

- Node.js 22+
- Docker 20+
- Docker Compose 2+

### 开发环境运行

#### 1. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
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
npm run server:dev
```

#### 4. 访问应用

前端访问地址：`http://localhost:5173`
后端API地址：`http://localhost:3001/api`

### 生产环境部署

#### 1. 使用Docker Compose部署

```bash
# 构建并启动服务
docker-compose up -d --build
```

#### 2. 访问应用

前端访问地址：`http://localhost:8090`
后端API地址：`http://localhost:3001/api`
测试页面地址：`http://localhost:8090/test-config-load.html`

#### 3. 停止服务

```bash
docker-compose down
```

### 生产环境单独部署

#### 1. 构建前端

```bash
npm run build
```

#### 2. 构建后端

```bash
npm run build:backend
```

#### 3. 启动后端服务

```bash
npm run server
```

## 开发流程

### 代码规范

- 遵循TypeScript编码规范
- 使用ESLint进行代码检查
- 使用Prettier进行代码格式化
- 遵循React最佳实践

### 提交规范

- 使用Conventional Commits规范
- 提交信息格式：`type(scope): description`
- 示例：`feat(network): add device status monitoring`

### 测试

- API测试：使用bash脚本测试所有API端点
- 测试命令：`./test_api.sh`
- TypeScript类型检查：`npx tsc --noEmit`
- 构建测试：`npm run build`

## 项目结构

```
├── src/
│   ├── components/             # React组件
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
├── test_api.sh                 # API测试脚本
├── package.json                # 项目配置
├── tsconfig.json               # TypeScript配置
├── tsconfig.app.json           # TypeScript应用配置
├── tsconfig.node.json          # TypeScript Node配置
├── vite.config.ts              # Vite配置
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

## 更新日志

### v1.0.1 (2025-12-31)

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

---

**网络监控系统** - 让网络管理更简单、更直观！