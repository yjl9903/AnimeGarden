# DeepSeek Harness 插件

`dsh-plugin-animegarden` 是 AnimeGarden 的 DeepSeek Harness 适配，由两部分组成：

- **Host 工具**：向模型注册 `animegarden_search_resources`，查询公开 API 并返回结构化结果。
- **Client 面板**：在 Harness Web UI 的侧边栏提供搜索、筛选与周历视图。
- **浮窗播放**：播放链接在整帧浮层中以可拖动/缩放的浮窗打开，不离开当前界面。
- **磁力链接打开**：面板中的磁力链接由 Host 的同源路由交给系统默认 BT 客户端打开，不再只能复制。
- **会话结果卡片**：`animegarden_search_resources` 的结果在会话里渲染为可展开卡片，播放、磁力、详情可直接操作，样式对齐 Harness 工具行与侧边栏面板。

用户安装和使用说明见 [plugins/dsh/README.md](../../plugins/dsh/README.md)；本文面向维护者，记录结构、数据流、构建与校验流程。

## 定位

- 手写维护源，位于 pnpm workspace 的 [`plugins/dsh/`](../../plugins/dsh/package.json)，不从 `plugins/agents/plugin.json` 生成，也不进入 `pnpm plugins:pack` 的归档。
- 通过 npm 包名 `dsh-plugin-animegarden` 分发；Harness 从 Plugins 页面或 `plugin_manager` 的 `install_bundle` 安装。官网 `/skills` 页的「安装插件」章节提供可复制的安装提示词，由 Harness 代理调用 `plugin_manager` 完成安装。
- 与 Codex / Cursor / Claude Code 等适配不同：这里提供原生 Host 工具和 Web UI 面板，不复用 skill 或远程 MCP。
- 版本需与 [`plugins/agents/plugin.json`](../../plugins/agents/plugin.json) 一致；插件版本独立于主项目版本维护，不参与根目录 `release` 脚本的版本递增。
- 兼容性：manifest 声明 `dsh.manifestVersion: 1` 与 `engines.dsh: ">=0.2.1-rc.5"`（另有 `engines.node: ">=24"`），插件管理器据此拒绝不兼容的 DSH 版本。

## 目录结构

```text
plugins/dsh/
├── package.json                 # manifest：exports、dsh.manifestVersion、engines、dsh.bundle/client
├── cordis.patch.yml             # Loader 行：baseURL 配置
├── build.config.ts              # Host 构建
├── build.config.client.ts       # Client 构建（单入口、React alias）
├── locale/{en,zh}.json          # Plugin Manager 展示的 title/description
├── icon.png / LICENSE
└── src/
    ├── index.ts                 # Host 插件入口（inject: tools）
    ├── host/
    │   ├── index.ts             # 注册所有工具、选项注入与（可选注入的）磁力打开路由
    │   ├── config/              # 浏览器选项：把 Loader 配置注入页面 global
    │   ├── shared/              # 配置解析、通用类型与工具函数
    │   ├── magnet/              # 磁力打开：同源路由、URI 校验、调用系统默认应用
    │   └── resources/           # 资源搜索工具：schema/args/api/render/types
    ├── shared/                  # Host 与 Client 共用：KeepShare、磁力链接契约、选项默认值、limit、资源展示与类型目录
    ├── client.ts                # 经典脚本入口，通过 __ModuleLoader__.load 注册
    └── client/
        ├── index.ts             # 面板槽位注册（sidebar/main）、QueryClient 生命周期
        ├── i18n.ts / ui.ts      # 文案与面板 CSS
        ├── react.ts             # 懒加载 loader 注入的 React
        ├── options.ts           # 读取 Host 注入的页面 global（浏览器选项）
        ├── api/                 # animegarden / bgm / umami
        ├── stores/              # panel 交互状态（@tanstack/store）
        ├── hooks/               # 查询、历史、滚动、周历等行为
        ├── components/          # 面板展示组件与共享图标
        ├── magnet/              # 全局磁力链接拦截：捕获点击并交给 Host 路由
        ├── toolview/            # 会话结果卡片：表格解析、面板样式行渲染与槽位注册
        ├── playback/            # 播放浮窗独立目录：store / window / links / icons / css / i18n
        └── shim/                # 构建期 React/react-dom alias 目标
```

Host 与 Client 共用逻辑放在 `src/shared/`，由 unbuild 分别内联进两个产物；新增工具时应按 `host/<tool>/` 独立成模块，并在 `host/index.ts` 注册；Client 侧的新功能按 `client/<feature>/` 独立成目录，在 `client/index.ts` 只保留装配。

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

Markdown 渲染直接列出原始字段与生成链接（标题、来源 `provider:providerId`、类型、字幕组/发布者、大小、发布时间、源站/详情/播放/下载），不再从标题解析规格。会话里的表格由 `tool.call.toolview` 卡片接管渲染，因此下载列的 `magnet:` URI 仍可从结果文本解析出来。

## Host：磁力链接打开

页面 JavaScript 不能启动桌面应用，DSH shell 也拦截 `magnet:` 导航，所以磁力链接的「打开」放在 Host：`src/host/magnet/` 注册一条同源路由，把 URI 交给操作系统注册的默认 BT 客户端。

- **路由**：`POST /plugins/dsh-plugin-animegarden/open-magnet`（路径常量在 `src/shared/magnet.ts`，Host 与 Client 共用）。只接受 `POST` + `application/json`，请求体为 `{ "magnet": "magnet:?xt=urn:btih:…" }`。
- **信任边界**：handler 第一步调用 `ctx.connection.requestRejection(request)`，沿用部署的 Host/Origin 校验与浏览器认证；未认证请求在参数校验与启动进程之前就被拒绝。
- **URI 校验**：`isMagnetUri` 只接受 `magnet:?` 开头且带 `xt=urn:btih:` / `xt=urn:btmh:` 的链接，长度上限 4096；其他协议、其他 `xt` 或畸形链接返回 `400`。
- **启动方式**：`ctx.subprocess.resolveExecutable` 解析平台 opener，再以 argv 方式 spawn（不经过 shell，URI 中的 `&` 不会被解释）：
  - macOS：`open <magnet>`
  - Windows：`rundll32.exe url.dll,FileProtocolHandler <magnet>`（`cmd /c start` 会把 `&` 当成命令分隔符，故不用）
  - Linux：`xdg-open <magnet>`
- **结果**：opener 退出码 0 返回 `200 {"ok":true}`；非 0 返回 `502`，消息带上 opener 的 stderr（例如 macOS 未注册 BT 客户端）；超过 5s 仍在运行的 opener 视为已交接，不杀掉。
- **可选注入**：路由通过 `ctx.inject(['webServer', 'connection', 'subprocess'], …)` 注册，CLI/headless 组合缺少这些服务时插件仍照常提供搜索工具。

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

### 浮窗播放

播放链接统一由 `src/shared/keepshare.ts` 生成（`https://keepshare.cc/gv78k1oi/<编码后的 magnet 前缀>`），插件把「新标签页打开」改成 DSH 内的全局浮窗（`embeddedPlayback: false` 时不安装拦截器和浮层，链接保持原生新标签页行为）：

- 浮窗注册在 `shell.overlay`（整帧浮层，位于所有列的滚动容器之外），因此切换面板、切换会话、打开设置都不影响播放；浮窗非模态，底层界面照常操作。该槽位本身 `pointer-events: none`，浮窗显式声明 `pointer-events: auto`。
- 浮窗逻辑集中在 `src/client/playback/`（`index.ts` 装配、`store.ts` 状态、`window.tsx` 组件、`links.ts` 链接拦截、`icons.tsx`/`css.ts`/`i18n.ts` 资源）；浮窗状态在 `playback/store.ts` 的 `@tanstack/store` 单例中保存（当前 URL/标题、拖拽后的矩形、iframe 重载计数）。拖拽与缩放只更新本地 React 状态，指针抬起时才提交 store 并写入 `localStorage`（键 `animegarden.playback.geometry`）；再次打开恢复位置，并按当前视口夹取，保证标题栏始终在屏幕内。
- `playback/links.ts` 在 `document` 上注册一次捕获阶段的 click 监听：任意 KeepShare 链接（面板标题/播放按钮、会话中模型输出的 Markdown 播放链接）都会 `preventDefault` 并转交浮窗；带修饰键或非左键的点击保持浏览器原生行为（新标签页/新窗口）。浮窗标题的优先级：面板链接的 `data-agp-playback-title`（资源标题）→ 锚点自带 `title` 属性 → 锚点文本（去掉 `▶` 前缀）；「播放 / Play / Watch」这类通用文案视为无标题，回落到本地化的「播放窗口」，不再把「播放」当资源标题。浮窗自己的「在浏览器打开」按钮带 `data-agp-playback-ignore`，跳过拦截。
- 播放页通过 iframe 嵌入（`allow="autoplay; fullscreen; picture-in-picture; clipboard-read; clipboard-write; encrypted-media"`、`allowFullScreen`、`referrerPolicy="no-referrer"`）。KeepShare 本身没有播放器：分享就绪时服务端直接 302 到 PikPak 分享页（`https://mypikpak.com/s/<id>`，带 `act=play`）；新磁力先落在 `console/shared/status` 状态页，页面每 2s 轮询 `/api/shared_link`（最多约 20 轮 / 40s），就绪后自己 `location.href` 跳到 PikPak，跳转只改 iframe 自身、不动顶层。KeepShare 全链路与 PikPak 分享页目前都不带 `X-Frame-Options` / CSP `frame-ancestors`，可以整条链放在浮窗里；mega 后端（显式 `?host=mega`）带 `X-Frame-Options: SAMEORIGIN`，不可嵌入，而 AnimeGarden 生成的链接不带该参数。页面样式属于第三方，不继承 DSH 主题。
- 标题栏左侧是品牌标记与资源标题，右侧只保留窗口控制：`[⋯] [最小化/还原] [关闭]`。页面级操作（重新加载、在浏览器打开）收进 `⋯` 溢出菜单（`role="menu"`，两个 `role="menuitem"`），标题栏因此只剩三个按钮、给标题留出空间；菜单在外部点击、Escape、切换页面、重新加载或最小化时关闭，Escape 会被菜单消费掉、不会连带关闭整个浮窗。关闭恒定在最右，悬停变错误色。整组带 `role="toolbar"`。拖动标题栏移动窗口；浮窗自身持有焦点时 Escape 关闭。关闭即卸载 iframe，停止播放。
- 四角均可缩放：指针按下任意一角后，对角保持不动，横纵各自夹取最小尺寸（`MIN_PLAYBACK_WIDTH/HEIGHT`）与视口内边距，因此贴边拖拽也不会把窗口拉出屏幕。上两角用 L 形热区（`clip-path`）避开标题栏右侧按钮；角上不画任何标记，靠 `nwse/nesw-resize` 光标提示可缩放。
- 最小化会把窗口收成右下角一条可拖动的标题条（宽度随视口、约 260–380px），只隐藏 body、不卸载 iframe，因此播放继续；标题条上只保留「还原」和「关闭」两个按钮（溢出菜单同时收起），给标题留出空间。点击标题条任意非按钮区域也会直接还原；点击与拖动用 4px 位移阈值区分——超过阈值才移动标题条，否则松手即还原，不会和拖动冲突。还原回到最小化前的窗口位置与大小，最小化条自己的位置也会记住。每次打开新的播放链接都会自动还原浮窗。

### 磁力链接打开

磁力链接在界面里的「打开」做成全局行为，避免面板、播放浮窗之外的入口各自处理（`openMagnet: false` 时 Host 不注册 open-magnet 路由、Client 不安装拦截器，面板与会话卡片的磁力动作改为复制）：

- 资源行的下载按钮从「复制磁力链接」改成 `<a href="magnet:…">`（`ResourceRow.tsx`），并带 `data-agp-magnet-link` 标记；普通点击由全局拦截器转交 Host 路由，`Shift`/`Cmd`/`Ctrl` 点击仍复制链接（复用 `useMagnetCopy`）。
- `src/client/magnet/index.ts` 在 `document` 上注册一次捕获阶段的 click 监听：任意带 `magnet:` href 的锚点（面板资源行、会话卡片里的磁力按钮）都会 `preventDefault` 并 `POST` 到 open-magnet 路由；插件自己的锚点保留冒泡以继续上报 `download` 埋点，外来锚点 `stopPropagation`，避免其他链接处理器重复打开。
- 打开失败（未安装 BT 客户端、opener 报错、路由不可达）时用 sonner toast 提示，不静默失败。
- 通知容器统一挂在 `shell.overlay`，不依赖搜索面板是否打开；面板与会话卡片都支持 `Shift` / `Cmd` / `Ctrl` 点击复制磁力链接，关闭 `openMagnet` 时普通点击复制也保留通知反馈。
- 局限：DSH 的 Markdown 渲染只保留 `http:`/`https:`/`mailto:` 链接，模型自己写的 `magnet:` 会变成纯文本；能点的是面板按钮与 `tool.call.toolview` 卡片里的磁力按钮，模型正文里的磁力链接无法拦截。

### 会话结果卡片

DSH 的 Markdown 渲染会丢弃 `magnet:` 锚点，所以默认工具视图里搜索结果的「下载」列只是纯文本。插件给该工具注册一张 `tool.call.toolview` 卡片（常开，不受配置控制）：

- `src/shared/tool.ts` 的 `SEARCH_RESOURCES_TOOL_NAME` 同时被 Host 工具和 Client 卡片使用，卡片的 key 即 wire tool 名；未命中的工具名继续用 Harness 通用卡片。
- 注册在 `src/client/toolview/index.ts`：`ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({ name: 'tool.call.toolview', key: <wire 名>, locale: NS }, AnimeGardenToolView))`。
- 折叠行优先对齐周围 Harness 工具行：沿用 `ToolRow` 的 24px 单行、16px leading、6px/8px 间距（分隔点两侧各 8px）、2×2 分隔点、13px secondary 字号与 secondary 配色，chevron 只在 hover / 聚焦 / 展开时出现。
- 折叠行读作 `🌸 搜索 Anime Garden 找到 N 个资源 · <筛选描述>`：数量在分隔点之前，筛选描述在之后；描述来自 Host 输出的 `筛选参数` 行（服务端实际应用的条件），按 `关键词 / 标题包含 / 类型 / 字幕组 / 发布者 / 番剧 / 来源 / 时间` 生成人类可读文本——类型值经 locale 类型目录翻译、日期只显示 `YYYY-MM-DD`、多个值用 `、`、多组用 `，`；无筛选时只显示数量（不出现分隔点）。运行中/失败时分隔点后显示状态文案。
- 展开体再参考侧边栏面板：13.5px 标题链接（KeepShare，点击进浮窗）、12px 元信息行（类型/发布时间/大小/详情）、字幕组 chip、28px 播放/磁力图标动作；每行底部 0.5px 分隔线。样式由卡片自身渲染（`toolview/css.ts`，`agtv-` 前缀，只用主题 token）。
- 数据来自 `block.content` 的文本块；`toolview/parse.ts` 把 Host 渲染的 10 列表格解析回行（处理 `\|` 转义与 `[label](url)` 单元格），不额外请求 API。解析失败或空结果时回退为原始文本，结果是错误时显示错误原因。

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

当前产物：`dist/client.mjs` 约 543 kB（gzip 约 124 kB），`dist/index.mjs` 约 184 kB。

## 配置

默认值写在 [`cordis.patch.yml`](../../plugins/dsh/cordis.patch.yml) 的 `insert[0].config`，由 Loader 读取：

| 字段               | 默认值                      | 说明                                                                                                                      |
| ------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `baseURL`          | `https://api.animes.garden` | 公开 API 端点                                                                                                             |
| `embeddedPlayback` | `true`                      | KeepShare 播放链接是否在 DSH 内嵌浮窗打开；`false` 时不安装浮窗与拦截器，链接保持浏览器原生新标签页行为                   |
| `openMagnet`       | `true`                      | 磁力链接是否交给系统默认 BT 客户端；`false` 时 Host 不注册 open-magnet 路由，面板与会话卡片的磁力动作恢复「复制磁力链接」 |

- 非布尔值、缺失字段都回落默认值；插件不导出 `Config` schema（避免引入 `@deepseek-ai/schemastery` 依赖），Host 用 `normalizePluginOptions` 做类型收敛。
- 配置传递：Host 在 `webserver/index-inject` 中注入 `global: __ANIMEGARDEN_OPTIONS__`（只含两个布尔开关，不含 `baseURL`），Client 在插件激活时同步读取；因此修改配置后需要**重载插件并刷新页面**。
- 本地目录安装可直接编辑该文件后重载；从 npm 安装的包可通过 profile 的 `cordis.patch.yml` 按 id 覆盖。匹配的 override 会**整体替换** `config`，所以需要同时写出 `baseURL`：

```yaml
- id: animegarden
  name: dsh-plugin-animegarden
  config:
    baseURL: https://api.animes.garden
    embeddedPlayback: false
    openMagnet: true
```

## 开发与验证

```sh
pnpm --filter dsh-plugin-animegarden typecheck
pnpm --filter dsh-plugin-animegarden build
pnpm plugins:check
```

- 本地调试：先 `build`，再从 Plugins 页面安装本地目录 `plugins/dsh/`；Host 改动需要重新构建并重启/重载插件，Client 改动需要刷新 Web 页面。
- 重载插件可用 `plugin_manager` 的 `set_plugin` 先 disable 再 enable；Client 产物带缓存，必要时硬刷新页面。
- 磁力打开路由可无浏览器验证是否已注册：`curl -i -X POST http://127.0.0.1:<port>/plugins/dsh-plugin-animegarden/open-magnet -H 'content-type: application/json'` 应返回 `401`（未通过浏览器认证）；路由未注册时该路径会落到 SPA fallback，返回 `405`。
- 验收时至少确认：侧边栏入口与图标、搜索防抖/回车、工具栏筛选、星期悬停预览、周历切换与前进/后退、无限滚动、播放/下载/详情链接、磁力链接打开（普通点击唤起系统 BT 客户端、`Shift`/`Cmd` 点击复制、未安装客户端时出现失败 toast、无认证请求被拒绝）、浮窗播放（面板与会话链接均可打开、四角缩放、最小化后继续播放、点击标题条还原、拖动标题条移动、Escape/关闭、切面板后仍保留），会话中 `animegarden_search_resources` 结果卡片（折叠行与上下文工具行风格一致、展开后按侧边栏面板样式渲染、标题进浮窗播放、磁力唤起系统客户端、详情外链、空结果与错误回退），两个开关关闭后的行为（`embeddedPlayback=false` 原生新标签页、`openMagnet=false` 复制磁力且无 open-magnet 路由），以及新会话中模型能调用 `animegarden_search_resources`。
- `pnpm plugins:check` 会校验 `icon.png` / `LICENSE` 与仓库源文件一致、`package.json` 的入口 / `dsh.manifestVersion` / `engines.node` / `engines.dsh` 与 `dsh.bundle.patch`、`cordis.patch.yml` 的 id/name、`src/index.ts` / `src/client.ts` / `tsconfig.json` / `build.config.ts` 存在，以及两份 locale 可解析且非空。
- `.husky/pre-commit` 已把 `plugins/dsh/` 纳入同步触发，并只自动暂存生成的 `icon.png` 与 `LICENSE`。

## 发布

```sh
# 首次发布前先登录 npm（或配置有效的 NPM_TOKEN）
npm login

pnpm --filter dsh-plugin-animegarden publish --access public --no-git-checks
```

`dist/` 不提交，`prepublishOnly` 会在发布前自动构建。发布前同步递增 `plugins/agents/plugin.json` 与 `plugins/dsh/package.json` 的版本，并按[插件主分支发布流程](./README.md#主分支发布流程)同步、检查和提交。根目录 `release` 只递增主项目的 apps/packages 版本，不修改插件版本。

包内 README 与根目录 README 顶部的版本徽章使用 DeepSeek logo 与品牌色，label 为 `dsh-plugin-animegarden`，数值直接读取 npm 上的插件版本；CI 与许可证徽章与其他包一致。发版后徽章自动更新，不需要手改 README。

## 已知限制

- Client 产物较大（约 543 kB，gzip 约 124 kB），主要来自内联的 `@animegarden/client`、zod、React Query、sonner、`apps/web` 搜索解析器与内嵌 Quicksand 字体子集；单入口约束下无法拆包。
- 运行时依赖 Harness 提供的 React 18.3.1；升级到 React 19 需要重新验证 shim 的元素品牌与 `react-dom` 兼容层。
- 浮窗内嵌的是 KeepShare → PikPak 的第三方页面，不继承 DSH 主题；若上游将来加上 `X-Frame-Options` / CSP `frame-ancestors`，嵌入会失败，此时仍可用浮窗头部的「在浏览器打开」。
- 新磁力第一次打开会先在 KeepShare 状态页等待 PikPak 侧转存（最多约 40s，超时后停在状态页），可用浮窗的重新加载按钮重试；PikPak 分享被删除或地区封禁时，浮窗里显示的是对方的错误页。
- PikPak 若要求登录，第三方 iframe 内的 Google OAuth 常被浏览器拒绝，需要改用「在浏览器打开」；mega 后端链接（`?host=mega`）无法嵌入。
- 浮窗播放依赖 iframe 的同源存储与自动播放策略；浏览器可能要求一次用户手势才允许自动播放（点击播放链接本身就是手势），静音策略、弹窗拦截等由上游页面决定。
- 磁力链接打开依赖 Host 所在机器的系统关联：未安装 BT 客户端、远程浏览器访问、或桌面环境没有注册 `magnet:` 处理程序时，路由返回 502 并提示；Windows 通过 `rundll32`、Linux 通过 `xdg-open` 打开，均以 argv 传递 URI。
- 会话 Markdown 中的 `magnet:` 链接被 DSH 渲染器过滤为纯文本（只放行 `http:`/`https:`/`mailto:`）；自身工具结果由卡片渲染出真实锚点，模型在正文里自己写的磁力链接仍无法点击。卡片解析的是结果文本，若该文本被压缩/裁剪（compaction pruning）则可能解析不完整并回退为原文。
- 浏览器选项只在页面启动时由 Host 注入，修改配置后必须重载插件并刷新页面才生效；模型正文里的磁力链接依旧是纯文本。
- 未做浏览器视觉回归，浅色/深色主题、中英文界面与浮窗交互需要人工验收。
