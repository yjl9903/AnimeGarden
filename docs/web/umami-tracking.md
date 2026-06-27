# Umami 埋点说明

本文总结 `apps/web` 当前已经接入的埋点，以及静态审计后仍未覆盖、可评估是否补充的点击埋点 TODO。

## 实现入口

统一封装在 `src/utils/umami.ts`, 主要有两种接入方式:

- 直接调用 `track(event, payload)`
- 给链接挂属性或事件
  - `getDownloadTrackEvent(provider, providerId)`
  - `getPikPakTrackEvent(provider, providerId)`
  - `getOpenFeedTrackEvent(href)`

## 当前已有埋点

### 资源下载和播放

| 事件名 | 触发场景 | 属性 |
| --- | --- | --- |
| `download` | 资源下载链接点击 | `resource = {provider}:{providerId}`，通过 `data-umami-event-resource` 上报 |
| `pikpak` | PikPak 播放/在线播放点击 | `resource = {provider}:{providerId}`，通过 `data-umami-event-resource` 上报 |
| `feed.open` | RSS 链接点击 | `href` |

当前接入位置：

- 资源表格 `src/components/Resources/table.tsx`
- 资源详情页 `src/routes/detail.$provider.$providerId/route.tsx`
- Header RSS `src/layouts/Header.tsx`
- Footer RSS `src/layouts/Footer.tsx`
- Subject 分组 RSS `src/routes/subject.$subject.($page)/route.tsx`

### 导航和全局入口

| 事件名 | 触发场景 | 属性 |
| --- | --- | --- |
| `nav.click.home` | Header 首页按钮点击 | `item` |
| `nav.click.anime` | Header 动画入口及其子项点击 | `item`，部分场景带 `group` |
| `nav.click.fansub` | Header 字幕组入口及其子项点击 | `item` |
| `nav.click.type` | Header 资源入口及其子项点击 | `item` |
| `theme.switch` | 主题切换 | `mode` |

当前接入位置：

- `src/layouts/Header.tsx`
- `src/layouts/ThemeToggle.tsx`

### 搜索框

| 事件名 | 触发场景 | 属性 |
| --- | --- | --- |
| `search.trigger` | 搜索触发 | `text`，`source` |
| `search.history.click` | 点击搜索历史 | `text` |
| `search.history.delete` | 删除搜索历史 / 清空搜索历史 | `action`，可选 `text`，可选 `count` |
| `search.suggestion.click` | 点击搜索联想项 | `text`，`subjectId` |
| `search.result.click` | 点击搜索结果详情项 | `text`，`resource` |

`search.trigger.source` 当前取值：

- `button`
- `command`
- `history`
- `result-more`

当前接入位置：

- `src/layouts/Search/Search.tsx`

### 资源列表和筛选

| 事件名 | 触发场景 | 属性 |
| --- | --- | --- |
| `resources.more.click` | 资源表格点击“更多” | `resource`，`type` |
| `resources.filter.click` | 资源表格精化筛选 | `filterType`，`value` |
| `anime.calendar.click` | 动画周历卡片点击 | `subjectId`，`title`，`weekday` |
| `subject.fallback-search` | Subject 页无资源时点击“前往搜索” | `subject` |

`resources.filter.click.filterType` 当前取值：

- `type`
- `fansub`
- `publisher`

当前接入位置：

- `src/components/Resources/table.tsx`
- `src/routes/anime/route.tsx`
- `src/routes/subject.$subject.($page)/route.tsx`

### 收藏夹和复制操作

| 事件名 | 触发场景 | 属性 |
| --- | --- | --- |
| `collection.open-sidebar` | 打开收藏夹侧栏 | 无 |
| `collection.add` | 添加当前筛选到收藏夹 | 无 |
| `collection.open` | 打开收藏夹页 | `hash` |
| `collection.share` | 复制收藏夹分享链接 | `hash` |
| `copy.feed` | 复制 RSS 链接 | 无 |
| `copy.magnet-links` | 复制所有磁力链接 | 无 |
| `copy.json` | 复制 JSON 数据 | 无 |
| `copy.fetch` | 复制 cURL / Python / JavaScript 请求代码 | `language` |
| `copy.iframe` | 复制 iframe 嵌入代码 | 无 |
| `collection.open-resources` | 收藏项菜单里“在新页面中打开” | `search` |

当前接入位置：

- `src/layouts/Sidebar/Sidebar.tsx`
- `src/layouts/Sidebar/Collection.tsx`
- `src/routes/resources.($page)/Filter.tsx`

### Footer 外链

| 事件名 | 触发场景 | 属性 |
| --- | --- | --- |
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

### 错误埋点

| 事件名 | 触发场景 | 属性 |
| --- | --- | --- |
| `error.render` | 页面渲染错误 | `path`，`error` |
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
- 动画周历左右滚动箭头
  - 文件：`src/routes/anime/route.tsx`
  - 建议属性：`weekday`，`direction`
- 动画周历星期锚点
  - 文件：`src/routes/anime/route.tsx`
  - 建议属性：`weekday`
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
