# 画布锁定功能实现计划

## 功能需求

将页面上控制面板上锁定画布的状态保存在config表中，页面加载时同步到页面。

## 实现步骤

### 1. 更新配置存储接口

* 在 `ConfigStore` 接口中添加 `lockCanvas` 状态

* 添加 `toggleCanvasLock` 方法

### 2. 更新配置存储实现

* 添加 `lockCanvas` 默认值

* 实现 `toggleCanvasLock` 方法

* 在 `partialize` 中添加 `lockCanvas` 以便持久化

### 3. 在配置面板中添加控制开关

* 在 `ConfigPanel` 组件中添加画布锁定开关

* 添加相关的国际化文本

### 4. 更新网络画布组件

* 在 `NetworkCanvas` 组件中使用 `lockCanvas` 状态

* 控制 ReactFlow 的交互属性：

  * `panOnDrag`

  * `nodesDraggable`

  * `edgesDraggable`

  * `selectable`

  * `nodesConnectable`

  * `zoomOnScroll`

  * `zoomOnDoubleClick`

### 5. 确保数据库同步

* 确保 `toggleCanvasLock` 方法将状态同步到数据库

* 确保 `fetchConfig` 方法从数据库加载 `lockCanvas` 状态

## 技术要点

* 使用 Zustand 状态管理

* 状态持久化到 localStorage 和数据库

* ReactFlow 交互属性控制

* 配置面板 UI 更新

## 文件修改

1. `/root/network-monitor/src/store/configStore.ts` - 更新配置存储
2. `/root/network-monitor/src/components/ConfigPanel.tsx` - 添加锁定开关
3. `/root/network-monitor/src/components/NetworkCanvas.tsx` - 使用锁定状态

## 预期效果

* 用户可以在配置面板中锁定/解锁画布

* 锁定状态会保存到数据库

* 页面刷新后保持锁定状态

* 锁定时画布不可拖拽、选择或编辑

