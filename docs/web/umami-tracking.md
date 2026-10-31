# Umami 事件契约

Web 埋点统一由 `apps/web/src/utils/umami.ts` 封装。
组件通过 `track(event, payload)`、专用 helper 或链接的 `data-umami-event-*` 属性上报。
本文按用户操作列出事件名称、字段和接入位置。

## 导航与页面入口

| 事件 | 触发 | 字段 |
| --- | --- | --- |
| `nav.click.home` | Header 首页入口 | item |
| `nav.click.anime` | Header 动画入口及子项 | item，部分场景带 group |
| `nav.click.fansub` | Header 字幕组入口及子项 | item |
| `nav.click.type` | Header 资源类型入口及子项 | item |
| `theme.switch` | 切换主题 | mode |
| `home.calendar.click` | 首页周历入口 | season，source |
| `anime.season.change` | 周历季度选择 | fromSeason、toSeason、source |
| `anime.calendar.click` | 周历番剧卡片 | subjectId、title、weekday |
| `footer.link.click` | Footer 外链 | section、label、href |

`home.calendar.click.source` 为 title 或 link；
`anime.season.change.source` 为 year 或 season。
Footer section 对应状态、源站、关于、开放、更多、版权分区。

接入位置：`src/layouts/Header.tsx`、`ThemeToggle.tsx`、`Footer.tsx`，
以及 `src/pages/_index/route.tsx`、`src/pages/anime/route.tsx`。

## 搜索

| 事件 | 触发 | 字段 |
| --- | --- | --- |
| `search.trigger` | 提交搜索 | text、source |
| `search.history.click` | 选择历史记录 | text |
| `search.history.delete` | 删除或清空历史 | action，可选 text、count |
| `search.suggestion.click` | 选择联想项 | text、subjectId |
| `search.result.click` | 选择结果详情 | text、resource |

`search.trigger.source` 为 button、command、history 或 result-more。
接入位置：`src/layouts/Search/Search.tsx`。

## 资源浏览、分页与筛选

| 事件 | 触发 | 字段 |
| --- | --- | --- |
| `resources.detail.click` | 资源表格的详情入口 | resource、type |
| `resources.load-more.click` | 单批预览的“→ 全部资源”链接 | path、search、kind |
| `resources.filter.click` | 资源表格精化筛选 | filterType、value |
| `subject.fallback-search` | Subject 空结果的“前往搜索” | subject |

`resource` 使用 `{provider}:{providerId}`。
`filterType` 为 type、fansub 或 publisher。
`resources.load-more.click` 专指用户点击预览链接，kind 为 link，
path 为当前 pathname，search 为当前 query string。
自动滚动续页属于查询行为，不上报点击事件。

接入位置：

- `src/components/Resources/table.tsx`
- `src/components/Resources/load-more.tsx`
- `src/pages/subject.$subject.($page)/route.tsx`

## 下载、播放与订阅

| 事件 | 触发 | 字段 |
| --- | --- | --- |
| `download` | 下载链接，包括 Skills 示例 | resource、source |
| `pikpak` | 播放链接 | resource、source |
| `feed.open` | RSS 链接 | href |

下载入口通过 `openMagnetLink()` 上报；播放入口通过 `getPikPakTrackEvent()` 生成属性；
RSS 入口通过 `getOpenFeedTrackEvent()` 上报。

接入位置：资源表格、`src/pages/detail.$provider.$providerId/route.tsx`、
Header、Footer、Subject 分组和 Skills 示例。

## 收藏夹与复制

| 事件 | 触发 | 字段 |
| --- | --- | --- |
| `collection.open-sidebar` | 打开收藏夹侧栏 | 无 |
| `collection.add` | 收藏当前筛选 | 无 |
| `collection.open` | 打开收藏夹页 | hash |
| `collection.share` | 复制分享链接 | hash |
| `collection.open-resources` | 收藏项菜单的“在新页面中打开” | search |
| `copy.feed` | 复制 RSS | 无 |
| `copy.magnet-links` | 复制磁力链接 | 无 |
| `copy.json` | 复制 JSON | 无 |
| `copy.fetch` | 复制请求代码 | language |
| `copy.iframe` | 复制 iframe | 无 |

`copy.fetch.language` 为 curl、python 或 javascript。
接入位置：`src/layouts/Sidebar/` 和 `src/pages/resources.($page)/Filter.tsx`。

## Skills

| 事件 | 触发 | 字段 |
| --- | --- | --- |
| `skills.copy` | 提示词、命令或示例复制成功 | kind、source，示例另带 example |
| `skills.chat.open` | 激活聊天应用入口 | app、source，示例另带 example |

复制事件：

- kind：prompt、command、example。
- source：hero、online、local、mcp.codex、mcp.claude、plugin.codex、plugin.claude、example。
- example：示例标题。

聊天应用事件的 source 为 direct 或 example，记录主键、键盘和中键激活。
“复制并打开”入口在复制成功后上报。
事件只携带入口元数据，提示词、安装命令和含 prompt 的目标 URL 留在本地操作中。

接入位置：`src/pages/skills/route.tsx` 的 CopyButton，
以及 `src/components/Skills/OpenInChat.tsx`。

## 错误

| 事件 | 触发 | 字段 |
| --- | --- | --- |
| `error.render` | 页面展示错误状态 | path、error |
| `error.fetch-resources` | 已有页面上的资源请求失败 | path、error |

错误标识通过统一 helper 生成。
接入位置：`src/pages/resources.($page)/Error.tsx`，首页、资源页、iframe 与 Subject 页面。

## 扩展规则

- 同类操作复用事件名称与字段定义。
- 跳转事件记录目标资源或 Subject 标识；筛选事件记录 filterType 和 value。
- 点击、复制成功、查询失败分别按实际触发时机记录。
- 新事件同时更新 helper 类型、调用点和对应测试。
