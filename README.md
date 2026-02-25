# 网络监控系统 (Network Monitor)

## 项目概述

网络监控系统是一个基于现代 Web 技术构建的实时网络设备监控平台，旨在为网络管理员提供直观、高效的网络管理解决方案。系统通过可视化方式展示网络设备的连接关系、实时状态和延迟数据，支持跨设备访问，可通过浏览器实时查看网络拓扑和设备状态。

采用前后端分离架构：前端基于 React 19 + TypeScript，后端基于 Node.js 22 + Express 5，通过 Socket.IO 实现实时数据推送，MySQL 8 存储设备信息和配置数据，Docker Compose 容器化部署。

## 系统架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Docker Compose                              │
│                                                                     │
│  ┌──────────────────────────────────────────────┐                   │
│  │           Frontend (Nginx :80)               │                   │
│  │                                              │                   │
│  │  ┌────────────────────────────────────────┐  │                   │
│  │  │        React 19 + TypeScript           │  │                   │
│  │  │                                        │  │                   │
│  │  │  ┌──────────┐  ┌───────────────────┐   │  │                   │
│  │  │  │ Zustand   │  │ React Flow        │   │  │                   │
│  │  │  │ Store     │  │ (网络拓扑可视化)   │   │  │                   │
│  │  │  └─────┬────┘  └───────────────────┘   │  │                   │
│  │  │        │                                │  │                   │
│  │  │  ┌─────┴────┐  ┌───────────────────┐   │  │                   │
│  │  │  │ Axios     │  │ Socket.IO Client  │   │  │                   │
│  │  │  │ (REST)    │  │ (实时通信)         │   │  │                   │
│  │  │  └─────┬────┘  └────────┬──────────┘   │  │                   │
│  │  └────────┼────────────────┼──────────────┘  │                   │
│  │           │                │                  │                   │
│  │     Nginx Reverse Proxy                      │                   │
│  │      /api ──┐   /socket.io ──┐               │                   │
│  └─────────────┼────────────────┼───────────────┘                   │
│                │                │                                    │
│                ▼                ▼                                    │
│  ┌──────────────────────────────────────────────┐                   │
│  │        Backend (Node.js 22 + Express 5 :3001)│                   │
│  │                                              │                   │
│  │  ┌──────────────────────────────────────┐    │                   │
│  │  │          REST API Routes             │    │                   │
│  │  │  /devices  /connections  /config     │    │                   │
│  │  │  /alerts   /health      /errors     │    │                   │
│  │  └──────────────────┬───────────────────┘    │                   │
│  │                     │                        │                   │
│  │  ┌──────────────────┼───────────────────┐    │                   │
│  │  │            Core Services             │    │                   │
│  │  │                                      │    │                   │
│  │  │  ┌────────────┐  ┌───────────────┐   │    │                   │
│  │  │  │ Alert      │  │ Monitoring    │   │    │                   │
│  │  │  │ Service    │  │ Service       │   │    │                   │
│  │  │  └────────────┘  └───────────────┘   │    │                   │
│  │  │  ┌────────────┐  ┌───────────────┐   │    │                   │
│  │  │  │ Cache      │  │ Logger        │   │    │                   │
│  │  │  │ Service    │  │ Service       │   │    │                   │
│  │  │  └────────────┘  └───────────────┘   │    │                   │
│  │  │  ┌────────────┐  ┌───────────────┐   │    │                   │
│  │  │  │ Config     │  │ ServerChan    │   │    │                   │
│  │  │  │ Service    │  │ (告警推送)     │   │    │                   │
│  │  │  └────────────┘  └───────────────┘   │    │                   │
│  │  └──────────────────────────────────────┘    │                   │
│  │                     │                        │                   │
│  │  ┌──────────────────┴───────────────────┐    │                   │
│  │  │     Socket.IO Server (实时推送)       │    │                   │
│  │  │  deviceUpdate / configUpdate         │    │                   │
│  │  └──────────────────────────────────────┘    │                   │
│  └──────────────────────┬───────────────────────┘                   │
│                         │                                           │
│                         ▼                                           │
│  ┌──────────────────────────────────────────────┐                   │
│  │             MySQL 8.0 (:3306)                │                   │
│  │                                              │                   │
│  │  ┌──────────┐ ┌────────────┐ ┌───────────┐  │                   │
│  │  │ devices  │ │ connections│ │ configs   │  │                   │
│  │  └──────────┘ └────────────┘ └───────────┘  │                   │
│  │  ┌──────────┐ ┌────────────┐                 │                   │
│  │  │ alerts   │ │ alert_     │                 │                   │
│  │  │          │ │ settings   │                 │                   │
│  │  └──────────┘ └────────────┘                 │                   │
│  └──────────────────────────────────────────────┘                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

数据流:
  浏览器 ──HTTP──▶ Nginx(:8090) ──/api──▶ Express(:3001) ──SQL──▶ MySQL(:3306)
  浏览器 ◀──WS──── Nginx ◀──Socket.IO──── Express (实时推送设备状态/告警)
```

### 架构要点

- **前后端分离**：前端通过 Nginx 提供静态资源，API 和 WebSocket 请求反向代理到后端
- **实时通信**：Socket.IO 双向通信，服务端主动推送设备状态变更和告警信息
- **告警链路**：Alert Service 检测异常 → 写入 MySQL → Socket.IO 推送前端 → ServerChan 微信通知
- **容器化编排**：三容器架构（Frontend / Backend / MySQL），通过健康检查保证启动顺序

## 核心特性

- **可视化管理**：基于 React Flow 的网络拓扑图，支持拖拽、缩放、设备连接
- **实时监控**：Socket.IO 实时推送设备状态、Ping 延迟、告警信息
- **智能告警**：设备离线检测、延迟阈值告警、ServerChan 推送通知
- **国际化**：基于 i18next 的多语言支持（中/英双语）
- **容器化部署**：Docker Compose 一键部署，Nginx 反向代理

### UI/UX 优化

- **侧边栏折叠**：Ant Design 图标触发器，半圆角设计，悬停高亮
- **加载动画**：Spin 组件全屏加载态，替代纯文本提示
- **空画布引导**：大图标 + 设备类型提示，引导用户添加设备
- **右键菜单美化**：圆角、柔和阴影、fadeIn 动画、红色删除图标
- **设备节点精简**：隐藏 MAC 地址，端口默认折叠为摘要行（可展开）
- **配置面板 Tabs 化**：5 个标签页（界面/Ping/ServerChan/告警阈值/消息模板）
- **折叠态 Tooltip**：侧边栏收起时显示工具提示
- **双击编辑**：双击设备节点打开配置面板，避免选中即弹窗
- **删除二次确认**：Popconfirm 防止误删设备
- **新设备随机偏移**：批量添加设备自动错位排列，避免重叠
- **全面 i18n 覆盖**：AlertPanel（告警表格列、状态标签、开关文字）、DeviceConfigPanel（IP/MAC 表单、虚拟机配置区、删除确认弹窗）、NetworkCanvas（空画布提示、右键菜单）等组件全量国际化

### 性能优化

- **deviceMap 查找**：Map 替代数组 `find()`，O(1) 边连接查找
- **MiniMap 回调缓存**：`useCallback` 避免 MiniMap 不必要重渲染
- **Handle 样式缓存**：`useMemo` 缓存节点连接点样式

## 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.2 | UI 框架 |
| TypeScript | 5.9 | 类型系统 |
| Vite | 5.4 | 构建工具 |
| Ant Design | 6.1 | UI 组件库 |
| React Flow | 11.11 | 网络拓扑图 |
| Zustand | 5.0 | 状态管理 |
| Socket.IO Client | 4.8 | 实时通信 |
| i18next | 25.7 | 国际化 |
| Recharts | 3.6 | 图表 |
| Axios | 1.13 | HTTP 请求 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 22+ | 运行时 |
| Express | 5.2 | Web 框架 |
| Socket.IO | 4.8 | WebSocket 服务 |
| MySQL | 8.0 | 数据库 |
| mysql2 | 3.16 | MySQL 驱动 |
| dotenv | 17.2 | 环境变量 |
| tsx | 4.21 | TypeScript 运行时 |

### 部署

| 技术 | 用途 |
|------|------|
| Docker + Docker Compose | 容器化部署 |
| Nginx | 反向代理 + 静态资源 |

## 项目结构

```
network-monitor/
├── server/                     # 后端代码
│   ├── index.ts                # 服务入口（Express + Socket.IO）
│   ├── configService.ts        # 数据库操作服务
│   ├── serverChanService.ts    # ServerChan 告警推送
│   ├── config/                 # 服务端配置
│   │   └── index.ts
│   └── services/               # 后端业务服务
│       ├── alertService.ts     # 告警规则引擎
│       ├── monitoringService.ts      # 系统监控（CPU/内存/事件循环）
│       ├── businessMonitoringService.ts  # 业务指标监控
│       ├── cacheService.ts     # 内存缓存服务
│       └── loggerService.ts    # 文件日志服务
├── src/                        # 前端代码
│   ├── App.tsx                 # 应用入口组件
│   ├── App.css                 # 应用样式
│   ├── main.tsx                # 入口文件
│   ├── index.css               # 全局样式
│   ├── components/             # React 组件
│   │   ├── NetworkCanvas.tsx   # 网络拓扑画布
│   │   ├── NetworkDeviceNode.tsx  # 设备节点组件
│   │   ├── Sidebar.tsx         # 侧边栏（设备添加）
│   │   ├── DeviceConfigPanel.tsx  # 设备配置面板
│   │   ├── ConfigPanel.tsx     # 系统配置面板
│   │   ├── AlertPanel.tsx      # 告警面板
│   │   ├── ErrorBoundary.tsx   # 错误边界
│   │   └── LanguageSwitcher.tsx  # 语言切换
│   ├── services/               # 前端服务
│   │   ├── websocketService.ts # WebSocket 客户端
│   │   └── loggerService.ts    # 前端日志（console）
│   ├── store/                  # 状态管理
│   │   ├── networkStore.ts     # 设备 & 连接状态
│   │   └── configStore.ts      # 系统配置状态
│   ├── config/                 # 前端配置
│   │   └── index.ts
│   ├── hooks/                  # 自定义 Hooks
│   │   └── useDragOptimization.ts
│   ├── i18n/                   # 国际化
│   │   └── config.ts
│   ├── utils/                  # 工具函数
│   │   └── performanceUtils.ts
│   ├── test/                   # 测试配置
│   │   └── setup.ts
│   └── assets/                 # 静态资源
├── types/                      # 共享 TypeScript 类型定义
│   └── index.ts                # DeviceType, NetworkDevice, Connection 等
├── docs/                       # 项目文档
│   ├── API_DOCUMENTATION.md
│   ├── CANVAS_OPTIMIZATION.md
│   ├── OPTIMIZATION_IMPLEMENTATION.md
│   ├── OPTIMIZATION_REPORT.md
│   └── OPTIMIZATION_REPORT_FINAL.md
├── tests/                      # 测试文件
│   └── manual/                 # 手动测试脚本
│       ├── test_api.sh         # API 端点测试
│       ├── test-alert.ts       # 告警功能测试
│       └── test-config-load.html  # 配置加载测试
├── public/                     # 静态资源（Vite）
├── deploy/                     # 部署相关文件
│   ├── docker-compose.yml      # Docker Compose 编排
│   ├── Dockerfile              # 后端 + 前端构建镜像
│   ├── Dockerfile.frontend     # 前端独立镜像（Nginx）
│   ├── nginx.conf              # Nginx 配置
│   └── mysql-init.sql          # 数据库初始化脚本
├── .env.example                # 环境变量示例
├── package.json                # 项目依赖
├── tsconfig.json               # TypeScript 项目引用
├── tsconfig.app.json           # 前端 TS 配置
├── tsconfig.server.json        # 后端 TS 配置
├── tsconfig.node.json          # Vite 配置 TS
├── vite.config.ts              # Vite 配置
├── vitest.config.ts            # Vitest 配置
└── eslint.config.js            # ESLint 配置
```

## 快速开始

### 环境要求

- Node.js 22+
- MySQL 8.0（开发环境）或 Docker 20+（容器化部署）

### 开发环境

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填写数据库连接信息

# 3. 启动后端
npm run server

# 4. 启动前端（另一个终端）
npm run dev

# 或同时启动前后端
npm start
```

- 前端：`http://localhost:5173`
- 后端 API：`http://localhost:3001/api`

### Docker 部署（推荐）

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env，修改数据库密码等敏感配置

# 2. 构建并启动
docker compose -f deploy/docker-compose.yml up -d --build

# 3. 查看状态
docker compose -f deploy/docker-compose.yml ps

# 4. 查看日志
docker compose -f deploy/docker-compose.yml logs -f
```

- 前端：`http://localhost:8090`
- 后端 API：`http://localhost:3001/api`

```bash
# 停止服务
docker compose -f deploy/docker-compose.yml down

# 重启服务
docker compose -f deploy/docker-compose.yml restart
```

## 环境变量

参考 `.env.example`：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MYSQL_ROOT_PASSWORD` | - | MySQL root 密码 |
| `DB_HOST` | `localhost` | 数据库主机 |
| `DB_PORT` | `3306` | 数据库端口 |
| `DB_USER` | `network_monitor` | 数据库用户 |
| `DB_PASSWORD` | - | 数据库密码 |
| `DB_NAME` | `network_monitor` | 数据库名 |
| `PORT` | `3001` | 后端端口 |
| `CLIENT_ORIGIN` | `http://localhost:5173` | CORS 允许来源 |
| `LOG_LEVEL` | `debug` | 日志级别（debug/info/warn/error） |
| `VITE_API_URL` | `/api` | 前端 API 路径 |
| `VITE_WS_URL` | `/` | 前端 WebSocket 路径 |

## API 接口

### 设备管理

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/devices` | 获取所有设备 |
| POST | `/api/devices` | 保存设备 |
| DELETE | `/api/devices/:id` | 删除设备 |

### 连接管理

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/connections` | 获取所有连接 |
| POST | `/api/connections` | 保存连接（自动去重） |
| DELETE | `/api/connections/:id` | 删除连接 |

### 配置管理

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/config` | 获取所有配置 |
| POST | `/api/config` | 更新配置 |

### 告警管理

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/alerts` | 获取告警（支持 `startDate`/`endDate` 筛选） |
| POST | `/api/alerts` | 创建告警 |
| GET | `/api/alerts/:deviceId` | 获取设备告警 |
| GET | `/api/alerts/rules` | 获取告警规则 |
| POST | `/api/alerts/rules/:ruleId/enable` | 启用规则 |
| POST | `/api/alerts/rules/:ruleId/disable` | 禁用规则 |
| GET | `/api/alerts/history` | 告警历史（支持 `limit` 参数） |
| GET | `/api/alerts/stats` | 告警统计 |
| GET | `/api/alerts/settings` | 获取所有设备告警设置 |
| GET | `/api/alerts/settings/:deviceId` | 获取设备告警设置 |
| POST | `/api/alerts/settings/:deviceId` | 更新设备告警设置 |

### 健康检查

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/health` | 基础健康检查 |
| GET | `/api/health/detailed` | 详细健康检查（系统指标 + 业务指标） |

### 错误上报

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/errors/log` | 前端错误上报 |

### WebSocket 事件

| 事件 | 方向 | 描述 |
|------|------|------|
| `deviceUpdate` | 服务端 → 客户端 | 设备状态更新推送 |
| `deviceUpdate` | 客户端 → 服务端 | 客户端更新设备 |
| `configUpdate` | 客户端 → 服务端 | 客户端更新配置 |

## 常用脚本

```bash
npm run dev          # 启动前端开发服务器
npm run server       # 启动后端服务
npm start            # 同时启动前后端
npm run build        # 构建前端
npm run lint         # ESLint 检查
npm test             # 运行测试
npm run test:watch   # 测试监听模式
npm run test:coverage # 测试覆盖率
```

## 日志

- 日志文件路径：`logs/network-monitor-YYYY-MM-DD.log`
- 日志级别：`debug` / `info` / `warn` / `error`
- 支持按日期自动切割、自动清理

## 常见问题

**前端无法连接后端**
- 检查 `VITE_API_URL` 和 `VITE_WS_URL` 是否正确
- 检查后端服务是否运行（`curl http://localhost:3001/api/health`）

**WebSocket 连接失败**
- 检查 Nginx 是否正确代理 WebSocket（`/socket.io`）
- 检查 `CLIENT_ORIGIN` 是否包含前端地址

**数据库连接失败**
- 检查 MySQL 服务是否运行
- 检查 `.env` 中的数据库配置
- Docker 环境下确认 `db` 容器健康状态

## 许可证

MIT

---

*Last updated: 2026-02-25*
