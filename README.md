# 极域音乐 Jiyu Music

极域音乐是一个基于 Vue 3 与 Tauri 2 构建的桌面音乐播放器，围绕多渠道搜索、歌单导入、本地管理和桌面端播放体验做了一套统一的应用壳层。

项目当前聚焦在桌面端形态，提供搜索、歌单、榜单、下载、播放器和设置等核心页面，并保留自定义音源扩展能力，方便后续继续接入新的渠道与能力。

## 功能亮点

- 多渠道歌曲搜索与聚合展示，默认支持综合搜索入口
- 歌单搜索、歌单导入与本地歌单管理
- 桌面端播放器、播放队列、歌词与播放详情页
- 下载管理、主题外观与桌面端设置面板
- 基于 Tauri 的本地能力接入，支持继续扩展音源和桌面功能

## 应用截图

### 搜索页

![搜索页](./.github/assets/readme/search-page.png)

### 我的歌单

![我的歌单](./.github/assets/readme/list-page.png)

### 设置页

![设置页](./.github/assets/readme/setting-page.png)

## 技术栈

- 前端：Vue 3、TypeScript、Vite、Vue Router、Pinia、Naive UI、motion-v
- 桌面端：Tauri 2、Rust
- 数据与能力：SQLite、Reqwest、Rodio

## 本地开发

### 环境要求

- Node.js 18+
- Rust stable
- pnpm 或 npm
- Tauri 2 对应的本机开发环境

### 启动项目

```bash
pnpm install
npm run tauri dev
```

仅启动前端调试界面：

```bash
npm run dev
```

## 打包命令

```bash
npm run build
npm run build:mac
npm run build:windows
npm run build:linux
```

## 项目结构

```text
src/
  components/    通用组件与桌面壳层
  modules/       搜索、播放、歌单等业务模块
  services/      更新、接口与能力封装
  stores/        全局状态管理
  views/         搜索、歌单、榜单、设置等页面
src-tauri/
  src/           Rust 侧桌面能力与后端实现
```

## 当前状态

- 项目已具备完整桌面应用框架与主要页面流转
- 部分渠道能力和可用性会受到对应音源状态影响
- 歌单导入当前优先围绕网易云音乐与 QQ 音乐场景持续完善

