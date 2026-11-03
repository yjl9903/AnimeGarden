# DeepSeek Harness 插件

`dsh-plugin-animegarden` 是 AnimeGarden 的 DeepSeek Harness 适配，由两部分组成：

- **Host 工具**：向模型注册 `animegarden_search_resources`，查询公开 API 并返回结构化结果。
- **Client 面板**：在 Harness Web UI 的侧边栏提供搜索、筛选与周历视图。

用户安装和使用说明见 [plugins/dsh/README.md](../../plugins/dsh/README.md)；本文面向维护者，记录结构、数据流、构建与校验流程。

## 定位

- 手写维护源，位于 pnpm workspace 的 [`plugins/dsh/`](../../plugins/dsh/package.json)，不从 `plugins/agents/plugin.json` 生成，也不进入 `pnpm plugins:pack` 的归档。
- 通过 npm 包名 `dsh-plugin-animegarden` 分发；Harness 从 Plugins 页面或 `plugin_manager` 的 `install_bundle` 安装。
- 与 Codex / Cursor / Claude Code 等适配不同：这里提供原生 Host 工具和 Web UI 面板，不复用 skill 或远程 MCP。
- 版本需与 [`plugins/agents/plugin.json`](../../plugins/agents/plugin.json) 一致；插件版本独立于主项目版本维护，不参与根目录 `release` 脚本的版本递增。

## 目录结构

```text
plugins/dsh/
├── package.json                 # manifest：exports、dsh.bundle.patch、dsh.client
├── cordis.patch.yml             # Loader 行：baseURL 配置
├── build.config.ts              # Host 构建
├── build.config.client.ts       # Client 构建（单入口、React alias）
├── locale/{en,zh}.json          # Plugin Manager 展示的 title/description
├── icon.png / LICENSE
└── src/
    ├── index.ts                 # Host 插件入口（inject: tools）
    ├── host/
    │   ├── index.ts             # 注册所有工具
    │   ├── shared/              # 配置解析、通用类型与工具函数
    │   └── resources/           # 资源搜索工具：schema/args/api/render/types
    ├── shared/                  # Host 与 Client 共用：KeepShare、limit、资源展示与类型目录
    ├── client.ts                # 经典脚本入口，通过 __ModuleLoader__.load 注册
    └── client/
        ├── index.ts             # 槽位注册、QueryClient 生命周期
        ├── i18n.ts / ui.ts      # 文案与面板 CSS
        ├── react.ts             # 懒加载 loader 注入的 React
        ├── api/                 # animegarden / bgm / umami
        ├── stores/panel.ts      # 交互状态（@tanstack/store）
        ├── hooks/               # 查询、历史、滚动、周历等行为
        ├── components/          # 纯展示组件
        └── shim/                # 构建期 React/react-dom alias 目标
```

Host 与 Client 共用逻辑放在 `src/shared/`，由 unbuild 分别内联进两个产物；新增工具时应按 `host/<tool>/` 独立成模块，并在 `host/index.ts` 注册。

## Host：资源搜索工具

工具名 `animegarden_search_resources`，实现位于 `src/host/resources/`：

| 文件        | 职责                                                                           |
| ----------- | ------------------------------------------------------------------------------ |
| `schema.ts` | 工具名、英文描述、参数 JSON Schema、输出 JSON Schema                           |
| `args.ts`   | 参数归一化与校验：数组化、去重、时间解析、枚举校验、`limit` 夹取               |
| `api.ts`    | 调用 `@animegarden/client` 的 `fetchResources`，把 `Date` 序列化并投影输出字段 |
| `render.ts` | `output.render`：Markdown 表格、分页/筛选/响应时间、空结果建议                 |
| `types.ts`  | `ToolResource`、`ToolFilter`、`ToolPagination` 与内部请求类型                  |

参数覆盖公开 API 的筛选字段：`search`、`include`、`keywords`、`exclude`、`fansubs`、`publishers`、`types`、`subjects`、`provider`、`preset`、`after`、`before`，另加结果条数 `limit`。

- `limit` 是工具侧的分页抽象（1–100，默认 30），内部映射为 client 的 `pageSize`；工具不暴露 `page`，始终读取第一页。
- 输出结构为 `{ filter, pagination, timestamp, resources }`：`filter` 是服务端实际应用的筛选组，`pagination` 为 `page/pageSize/complete`，`timestamp` 是响应时间（ISO）。
- `resources` 每项包含 `provider`、`providerId`、`title`、`href`、`detailUrl`、`type`、`magnet`、`keepshareUrl`、`size`、`sizeText`、`fansub`、`publisher`、`createdAt`；`detailUrl` 与 `keepshareUrl` 是生成的链接字段。
- 配置由 `src/host/shared/options.ts` 解析：只读 Loader 行 `config.baseURL`，去掉尾部 `/`，缺省回退到 `DefaultBaseURL`。

Markdown 渲染直接列出原始字段与生成链接（标题、来源 `provider:providerId`、类型、字幕组/发布者、大小、发布时间、源站/详情/播放/下载），不再从标题解析规格。

## Client：面板与周历

### 状态划分

- **服务端数据**：TanStack Query。`QueryClient` 统一配置 `retry: 1`、`refetchOnWindowFocus: false`、`staleTime: 60s`；资源列表用 `useInfiniteQuery`，周历用 `useQuery`（`staleTime` 5 分钟）。
- **交互状态**：`@tanstack/store` 的 `stores/panel.ts`，保存搜索文本、提交文本、视图、历史栈、悬停/激活星期、周历交接标记等；组件通过 `hooks/usePanelStore.ts` 的 `useSyncExternalStore` 订阅，避免多层回调透传。
- **行为**：`hooks/` 下按职责拆分——`useResourceSearch`（解析、查询、防抖、埋点）、`useSearchActions`（token 改写）、`useCalendarData`（周历查询与延迟切换）、`useNavHistory`（前进/后退与滚动恢复）、`useInfiniteScroll`、`useStickyHeader`、`useActiveWeekday`、`useMagnetCopy`。
- **展示**：`components/` 只做渲染，`AnimeGardenPanel.tsx` 负责组合 hooks、store 与视图切换。

### 搜索

- 搜索框文本是筛选的唯一来源：解析复用 `apps/web/src/layouts/Search/parse.ts` 的 `parseSearchInput`，请求筛选由解析结果加隐藏的 Bangumi subject id 组成。
- 工具栏下拉、字幕组标签、周历/悬停列表的动画通过共享解析器的 `setSearchFilters(text, filters)` 设置对应条件。对象中未提供的字段保持不变，提供的字段整体覆盖，空数组清除；同时处理英文别名、全角冒号和带引号的值，并保留其他条件。
- 编辑搜索框时，提交前保留现有查询；提交后仅当动画 token 改变或移除时清除周历绑定的 subject id，追加其他条件仍保留绑定。
- 输入后 350ms 防抖自动搜索，回车立即搜索；中文输入法组合期间不触发。历史导航和工具栏动作已提交的文本不会再次触发防抖提交。
- 列表按发布时间从新到旧排列；底部 sentinel 通过 `IntersectionObserver` 自动加载下一页（`rootMargin: 300px`，两批之间至少间隔 1 秒）。请求进行中或列表隐藏时暂停观察，分页失败后由用户重试；加载与错误状态复用同一套 `LoadingStatus` / 重试行。

### 周历

数据直接来自 `https://bgm.animes.garden`，该服务已开启 CORS（`access-control-allow-origin: *`），因此不需要 Host 代理：

- `GET /calendars`：季列表，优先取 `is_active`，否则取最新一季。
- `GET /calendar?season=YYYY-MM`：按星期分组的 7 个数组（下标 0 为周一），末尾另有 `web` 字段。
- 星期从「Asia/Shanghai 的现在减 6 小时」推算后旋转 7 天，并追加 `WEB` 分类，与网站周历一致。
- 海报取 `https://bgm.animes.garden/bangumi/subject/{id}/poster.jpeg?quality=large`；没有海报的条目过滤掉。
- 点击卡片在面板内按该番剧筛选资源（不离开面板）。

### 埋点

Client 直接向 `https://umami.animes.garden/api/send` 上报，复用网站 website id、页面路径 `/_/dsh-plugin` 与 `tag: "dsh-plugin"`。事件名与字段严格复用 `apps/web/src/utils/umami.ts`：`search.trigger`、`resources.filter.click`、`pikpak`、`download`、`resources.detail.click`、`anime.calendar.click`、`error.fetch-resources`；`search.trigger` 含搜索文本。进入面板时上报一次 PV（该部署把 pageview 记录为无 `name` 的 `event`）。失败静默，不影响界面。

## React 注入与构建

Harness 只通过 `window.__ModuleLoader__.load` 的 factory 以 `require('react')` 提供 React 18.3.1；而 `@tanstack/react-query`、`sonner` 与 JSX 运行时在源码中静态 import React。因此 `build.config.client.ts` 把：

- `react` → `src/client/shim/react-shim.ts`
- `react/jsx-runtime` → `src/client/shim/react-jsx-runtime-shim.ts`
- `react-dom` → `src/client/shim/react-dom-shim.ts`（只保留 `flushSync`，供 `sonner` 使用）

shim 不 import React 运行时，而是懒加载 loader 注入的实例；`sonner` 在模块求值期创建 toast 图标，shim 用 React 18 元素品牌（`Symbol.for('react.element')`）现场构造，待真实 renderer 可用后再渲染。

构建分两段：

- `build.config.ts` → `dist/index.mjs`（ESM，导出 `apply` / `inject` / `name`）
- `build.config.client.ts` → `dist/client.mjs`（单文件经典脚本，只有一个 `__ModuleLoader__.load` 调用点）

Client 必须保持**单入口**：一旦拆成多入口，Rollup 会生成共享 chunk，产物出现顶层 `import`，无法作为经典脚本加载。构建期同时把 `process.env.NODE_ENV` 替换为 `"production"`。

依赖（`@animegarden/client`、`@animegarden/shared`、`@tanstack/react-query@5.105.1`、`@tanstack/store@0.11.2`、`sonner@2.0.8` 等）全部在 `devDependencies`，unbuild 内联后**发布的 npm 包没有运行时依赖**。

当前产物：`dist/client.mjs` 约 492 kB（gzip 约 114 kB），`dist/index.mjs` 约 178 kB。

## 配置

默认值写在 [`cordis.patch.yml`](../../plugins/dsh/cordis.patch.yml) 的 `insert[0].config`，由 Loader 读取：

| 字段      | 默认值                      | 说明          |
| --------- | --------------------------- | ------------- |
| `baseURL` | `https://api.animes.garden` | 公开 API 端点 |

本地目录安装可直接编辑该文件并重启 Harness；从 npm 安装的包需修改后重新安装并重启。

## 开发与验证

```sh
pnpm --filter dsh-plugin-animegarden typecheck
pnpm --filter dsh-plugin-animegarden build
pnpm plugins:check
```

- 本地调试：先 `build`，再从 Plugins 页面安装本地目录 `plugins/dsh/`；Host 改动需要重新构建并重启/重载插件，Client 改动需要刷新 Web 页面。
- 重载插件可用 `plugin_manager` 的 `set_plugin` 先 disable 再 enable；Client 产物带缓存，必要时硬刷新页面。
- 验收时至少确认：侧边栏入口与图标、搜索防抖/回车、工具栏筛选、星期悬停预览、周历切换与前进/后退、无限滚动、播放/下载/详情链接，以及新会话中模型能调用 `animegarden_search_resources`。
- `pnpm plugins:check` 会校验 `icon.png` / `LICENSE` 与仓库源文件一致、`package.json` 的入口与 `dsh.bundle.patch`、`cordis.patch.yml` 的 id/name、`src/index.ts` / `src/client.ts` / `tsconfig.json` / `build.config.ts` 存在，以及两份 locale 可解析且非空。
- `.husky/pre-commit` 已把 `plugins/dsh/` 纳入同步触发，并只自动暂存生成的 `icon.png` 与 `LICENSE`。

## 发布

```sh
# 首次发布前先登录 npm（或配置有效的 NPM_TOKEN）
npm login

pnpm --filter dsh-plugin-animegarden publish --access public --no-git-checks
```

`dist/` 不提交，`prepublishOnly` 会在发布前自动构建。发布前同步递增 `plugins/agents/plugin.json` 与 `plugins/dsh/package.json` 的版本，并按[插件主分支发布流程](./README.md#主分支发布流程)同步、检查和提交。根目录 `release` 只递增主项目的 apps/packages 版本，不修改插件版本。

## 已知限制

- Client 产物较大（约 492 kB，gzip 约 114 kB），主要来自内联的 `@animegarden/client`、zod、React Query、sonner、`apps/web` 搜索解析器与内嵌 Quicksand 字体子集；单入口约束下无法拆包。
- 运行时依赖 Harness 提供的 React 18.3.1；升级到 React 19 需要重新验证 shim 的元素品牌与 `react-dom` 兼容层。
- 未做浏览器视觉回归，浅色/深色主题与中英文界面需要人工验收。
