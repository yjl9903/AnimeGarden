# Umami 埋点说明

本文总结 `apps/web` 当前已经接入的埋点，以及静态审计后仍未覆盖、可评估是否补充的点击埋点 TODO。

## 实现入口

统一封装在 `src/utils/umami.ts`，只提供两种通用接入方式，不再为每个事件导出专用函数：

```tsx
track('copy.feed');
track('copy.fetch', { language: 'curl' });
track('nav.click.anime', { item: '动画标题', group: '周一' });

<a
  href={playURL}
  {...getTrackAttributes('pikpak', { resource: `${provider}:${providerId}`, source: 'play' })}
>
  播放
</a>;
```

- 事件名在 `events` 中逐个显式声明，调用处直接使用完整字面量；不通过前缀、分类或模板生成事件名。
- `events` 使用项目已有的 Zod 定义字段，`TrackEventName` 和 `TrackPayload<'skills.copy'>` 从同一份定义推导。新增事件只需补充该定义和本文事件表，不新增包装函数。
- 两个方法均校验事件名与 payload 的对应关系：必填 payload 不可省略，无 payload 的事件不能传对象，字段及枚举值都有类型约束。导航事件允许省略整个 payload，但传入时需要 `item`。
- 两种接入共用字段白名单，运行时剔除未知字段和 `undefined`；可选的 `example`、搜索历史 `text`/`count` 延续原有规则，空字符串不上传。不要把完整提示词、命令或复制正文放入埋点字段。
- `getTrackAttributes` 只生成 `data-umami-event` 和 `data-umami-event-*` 属性，不发送事件、不生成 `onClick`。同一点击不要同时用属性和 `track` 上报。
- `getTrackAttributes` 的事件范围由 `TrackAttributeEventName` 从 schema 自动推导：仅允许所有 payload 字段名均为小写的事件（包括无 payload 的事件）。HTML 会将属性名转为小写，因此带 `subjectId` 的 `search.suggestion.click` / `anime.calendar.click`、带 `filterType` 的 `resources.filter.click` 只能调用 `track`，属性方法在编译期拒绝这些事件。现有上报字段名及历史数据不变。
- 需要控制触发时机的操作继续使用 `track`：例如复制成功、搜索去重以及聊天应用中键激活。RSS 保留显式 `onClick`；磁力链接继续由 `openMagnetLink` 阻止默认跳转并调用 `track('download', ...)`。
- `track` 在 SSR、Umami 未加载或被拦截时静默跳过；同步上报错误不会打断用户操作。

## 当前已有埋点

### 资源下载和播放

| 事件名      | 触发场景                 | 属性                                                                        |
| ----------- | ------------------------ | --------------------------------------------------------------------------- |
| `download`  | 资源下载链接点击（含 Skills 示例） | `resource = {provider}:{providerId}`，`source`（Skills 示例为 `skills`）                              |
| `pikpak`    | PikPak 播放/在线播放点击 | `resource = {provider}:{providerId}`，通过 `data-umami-event-resource` 上报 |
| `feed.open` | RSS 链接点击             | `href`                                                                      |

当前接入位置：

- 资源表格 `src/components/Resources/table.tsx`
- 资源详情页 `src/routes/detail.$provider.$providerId/route.tsx`
- Header RSS `src/layouts/Header.tsx`
- Footer RSS `src/layouts/Footer.tsx`
- Subject 分组 RSS `src/routes/subject.$subject.($page)/route.tsx`

### 导航和全局入口

| 事件名             | 触发场景                      | 属性                       |
| ------------------ | ----------------------------- | -------------------------- |
| `nav.click.home`   | Header 首页按钮点击           | `item`                     |
| `nav.click.anime`  | Header 动画入口及其子项点击   | `item`，部分场景带 `group` |
| `nav.click.fansub` | Header 字幕组入口及其子项点击 | `item`                     |
| `nav.click.type`   | Header 资源入口及其子项点击   | `item`                     |
| `theme.switch`     | 主题切换                      | `mode`                     |

当前接入位置：

- `src/layouts/Header.tsx`
- `src/layouts/ThemeToggle.tsx`

### 搜索框

| 事件名                    | 触发场景                    | 属性                                |
| ------------------------- | --------------------------- | ----------------------------------- |
| `search.trigger`          | 搜索触发                    | `text`，`source`                    |
| `search.history.click`    | 点击搜索历史                | `text`                              |
| `search.history.delete`   | 删除搜索历史 / 清空搜索历史 | `action`，可选 `text`，可选 `count` |
| `search.suggestion.click` | 点击搜索联想项              | `text`，`subjectId`                 |
| `search.result.click`     | 点击搜索结果详情项          | `text`，`resource`                  |

`search.trigger.source` 当前取值：

- `button`
- `command`
- `history`
- `result-more`

当前接入位置：

- `src/layouts/Search/Search.tsx`

### 资源列表和筛选

| 事件名                    | 触发场景                         | 属性                            |
| ------------------------- | -------------------------------- | ------------------------------- |
| `resources.detail.click`  | 资源表格点击“详情”               | `resource`，`type`              |
| `resources.filter.click`  | 资源表格精化筛选                 | `filterType`，`value`           |
| `anime.calendar.click`    | 动画周历卡片点击                 | `subjectId`，`title`，`weekday` |
| `subject.fallback-search` | Subject 页无资源时点击“前往搜索” | `subject`                       |

`resources.filter.click.filterType` 当前取值：

- `type`
- `fansub`
- `publisher`

当前接入位置：

- `src/components/Resources/table.tsx`
- `src/pages/anime/route.tsx`
- `src/routes/subject.$subject.($page)/route.tsx`

### 收藏夹和复制操作

| 事件名                      | 触发场景                                 | 属性       |
| --------------------------- | ---------------------------------------- | ---------- |
| `collection.open-sidebar`   | 打开收藏夹侧栏                           | 无         |
| `collection.add`            | 添加当前筛选到收藏夹                     | 无         |
| `collection.open`           | 打开收藏夹页                             | `hash`     |
| `collection.share`          | 复制收藏夹分享链接                       | `hash`     |
| `copy.feed`                 | 复制 RSS 链接                            | 无         |
| `copy.magnet-links`         | 复制所有磁力链接                         | 无         |
| `copy.json`                 | 复制 JSON 数据                           | 无         |
| `copy.fetch`                | 复制 cURL / Python / JavaScript 请求代码 | `language` |
| `copy.iframe`               | 复制 iframe 嵌入代码                     | 无         |
| `collection.open-resources` | 收藏项菜单里“在新页面中打开”             | `search`   |

复制统计统一表示成功写入剪贴板：资源页的 RSS、磁力链接、JSON、请求代码、iframe，以及收藏夹 RSS 和分享链接，每次操作仅在 `clipboard.writeText` 成功后上报一次。等待写入、写入失败或复制前校验失败（如缺少 RSS URL、没有磁力链接）均不上报；不在 `finally` 中记录复制事件。

当前接入位置：

- `src/layouts/Sidebar/Sidebar.tsx`
- `src/layouts/Sidebar/Collection.tsx`
- `src/routes/resources.($page)/Filter.tsx`

### Footer 外链

| 事件名              | 触发场景        | 属性                       |
| ------------------- | --------------- | -------------------------- |
| `footer.link.click` | Footer 外链点击 | `section`，`label`，`href` |

当前覆盖的 section：

- `状态`
- `源站`
- `关于`
- `开放`
- `更多`
- `版权`

当前接入位置：

- `src/layouts/Footer.tsx`

### Skills 复制操作

| 事件名 | 触发场景 | 属性 |
| --- | --- | --- |
| `skills.copy` | Skills 页「复制提示词 / 复制命令 / 复制示例」成功后 | `kind`，`source`，示例另带 `example` |

- `kind = prompt / command / example`：分别表示提示词、安装命令和使用示例。
- `source = hero / online / local`：分别表示首屏对话、直接使用、安装 Skill。
- `source = mcp.codex / mcp.claude / plugin.dsh / plugin.codex / plugin.claude`：区分 MCP、插件安装及所选客户端。
- `source = example`：试着问它；`example` 为示例标题。
- 仅在剪贴板写入成功后上报，复制失败不记录；不上传完整提示词、命令或示例正文。
- 接入位置：`src/pages/skills/route.tsx` 的 `CopyButton`，调用 `track('skills.copy', payload)`。

### Skills 聊天应用入口

| 事件名 | 触发场景 | 属性 |
| --- | --- | --- |
| `skills.chat.open` | 「打开」菜单中选择 ChatGPT、Codex、Claude、Cursor、DeepSeek、豆包、Kimi、千问或元宝 | `app`，`source`，示例入口另带 `example` |

- `source = direct`：直接使用。
- `source = example`：试着问它；`example` 为示例标题。
- 记录链接的鼠标主键、键盘和中键激活；仅展开菜单不记录，不代表目标应用已成功加载。
- 国产应用的「复制并打开」在复制成功后上报，复制失败不记录打开事件。
- 不上传完整 prompt 或含 prompt 的目标 URL。
- 接入位置：`src/components/Skills/OpenInChat.tsx`，调用 `track('skills.chat.open', payload)`。

### 错误埋点

| 事件名                  | 触发场景     | 属性            |
| ----------------------- | ------------ | --------------- |
| `error.render`          | 页面渲染错误 | `path`，`error` |
| `error.fetch-resources` | 拉取资源失败 | `path`，`error` |

当前接入位置：

- `src/routes/resources.($page)/Error.tsx`
- `src/routes/_index/route.tsx`
- `src/routes/resources.($page)/route.tsx`
- `src/routes/iframe/route.tsx`
- `src/routes/subject.$subject.($page)/route.tsx`

## 未覆盖点击埋点 TODO

下面是静态审计后整理出的候选项，按优先级分层，供评估是否补充。

### 高优先级

- 分页点击
  - 文件：`src/components/Resources/pagination.tsx`
  - 场景：上一页、页码、下一页
  - 建议属性：`page`，`targetPage`，`kind`
- 详情页原链接外跳
  - 文件：`src/routes/detail.$provider.$providerId/route.tsx`
  - 场景：点击“原链接”
  - 建议属性：`resource`，`href`
- 详情页发布者/字幕组跳转
  - 文件：`src/routes/detail.$provider.$providerId/route.tsx`
  - 场景：点击发布者卡片、字幕组卡片
  - 建议属性：`filterType`，`value`，`resource`
- 搜索结果页筛选摘要跳转
  - 文件：`src/routes/resources.($page)/Filter.tsx`
  - 场景：点击筛选摘要中的动画、发布者、字幕组
  - 建议属性：`filterType`，`value`
- Subject 页分享按钮
  - 文件：`src/routes/subject.$subject.($page)/subject.tsx`
  - 场景：复制主题页链接
  - 建议属性：`subjectId`，`title`
- Subject 页 Bangumi 外链
  - 文件：`src/routes/subject.$subject.($page)/subject.tsx`
  - 场景：点击外部 Bangumi 链接
  - 建议属性：`subjectId`，`href`
- 收藏夹项管理操作
  - 文件：`src/layouts/Sidebar/Collection.tsx`
  - 场景：重命名、删除
  - 建议属性：`search`，必要时带 `name`

### 中优先级

- 收藏夹侧栏快捷入口
  - 文件：`src/layouts/Sidebar/Sidebar.tsx`
  - 场景：动画周历、所有资源、高级搜索帮助
  - 建议属性：`item`
- 收藏夹项主点击
  - 文件：`src/layouts/Sidebar/Collection.tsx`
  - 场景：点击某个收藏条件进入资源页
  - 建议属性：`search`
- Subject 分组标题点击
  - 文件：`src/routes/subject.$subject.($page)/route.tsx`
  - 场景：点击分组标题里的字幕组/发布者名
  - 建议属性：`filterType`，`value`，`subjectId`
- Subject 分组“搜索更多资源...”
  - 文件：`src/routes/subject.$subject.($page)/route.tsx`
  - 场景：点击分组下方查看更多
  - 建议属性：`filterType`，`value`，`subjectId`
- 收藏夹详情页过滤块标题点击
  - 文件：`src/routes/collection.$hash/route.tsx`
  - 场景：点击每个块的标题跳到资源页
  - 建议属性：`hash`，`search`
- 资源标题和发布时间点击
  - 文件：`src/components/Resources/table.tsx`
  - 场景：点击标题进入详情，点击发布时间进入详情
  - 建议属性：`resource`，`type`
- 搜索框高级搜索帮助
  - 文件：`src/layouts/Search/Search.tsx`
  - 场景：点击“高级搜索帮助”
  - 建议属性：`href`
- 搜索框高级搜索补全项
  - 文件：`src/layouts/Search/Search.tsx`
  - 场景：点击“包含关键词 / 排除关键词 / 字幕组 / 标题 / 晚于 / 早于 / 类型”
  - 建议属性：`item`

### 低优先级

- 搜索框清空按钮
  - 文件：`src/layouts/Search/Search.tsx`
  - 建议属性：无或 `hasInput`
- 动画周历星期锚点
  - 文件：`src/pages/anime/route.tsx`
  - 建议属性：`weekday`，`season`
- 动画周历季度切换
  - 文件：`src/pages/anime/route.tsx`
  - 建议属性：`fromSeason`，`toSeason`
- Hero 标题回首页
  - 文件：`src/layouts/Layout.tsx`
  - 建议属性：`item = hero-home`
- Footer 内链
  - 文件：`src/layouts/Footer.tsx`
  - 场景：`API 文档`、`站点地图`
  - 建议属性：`label`
- 收藏夹侧栏关闭按钮
  - 文件：`src/layouts/Sidebar/Sidebar.tsx`
  - 建议属性：无
- 收藏夹空状态引导入口
  - 文件：`src/layouts/Sidebar/Sidebar.tsx`
  - 建议属性：`item = empty-state`

## 建议的补点原则

- 优先埋“会改变页面流转或代表用户明确意图”的点击
- 同一类行为尽量复用统一事件名和属性结构
- 对跳转类行为优先带上目标对象，例如 `resource`、`subjectId`、`href`
- 对筛选类行为优先带 `filterType` 和 `value`
- 非核心 UI 细节，例如纯视觉滚动辅助按钮，可以放到低优先级
