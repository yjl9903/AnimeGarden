# 🌸 Anime Garden

[![Group](https://img.shields.io/badge/Telegram-2CA5E0?style=flat&logo=telegram&logoColor=white)](https://t.me/animegarden_dev)
[![version](https://img.shields.io/npm/v/@animegarden/client?label=@animegarden/client)](https://www.npmjs.com/package/@animegarden/client)
[![CI](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml)
[![Ask DeepWiki](./assets/deepwiki.svg)](https://deepwiki.com/yjl9903/AnimeGarden)

[English](/README.en.md) | [简体中文](/README.md)

[動漫花園](https://share.dmhy.org/) 第三方 [镜像站](https://animes.garden) 以及 [动画 BT 资源聚合站](https://animes.garden).

+ ☁️ 为开发者准备的开放 [API 接口](https://animes.garden/docs/api)
+ 📺 查看 [动画放送时间表](https://animes.garden/anime) 来找到你喜欢的动画
+ 🔖 支持丰富的高级搜索, 例如: `上伊那牡丹 +简日 字幕组:喵萌奶茶屋 类型:动画`
+ 📙 自定义 RSS 订阅链接, 例如: [上伊那牡丹](https://api.animes.garden/feed.xml?subject=543360&fansub=%E5%96%B5%E8%90%8C%E5%A5%B6%E8%8C%B6%E5%B1%8B&keyword=%E7%AE%80%E6%97%A5)
+ ⭐ 搜索条件收藏夹和生成聚合的 RSS 订阅链接
+ 👷‍♂️ 支持与 [AutoBangumi](https://www.autobangumi.org/) 和 [AnimeSpace](https://github.com/yjl9903/AnimeSpace) 集成

> **讨论群**: [Telegram @animegarden_dev](https://t.me/animegarden_dev)
>
> **推送频道**: [Telegram @animegarden_channel](https://t.me/animegarden_channel)
>
> **项目文档**: [由 DeepWiki 生成](https://deepwiki.com/yjl9903/AnimeGarden)

[![home](./assets/home.jpeg)](https://animes.garden/resources/1?subject=543360)

## 使用插件

选择你使用的 Agent 客户端安装插件.

**Codex**

```bash
codex plugin marketplace add yjl9903/AnimeGarden
codex plugin add animegarden@animegarden
```

**Claude Code**

```bash
claude plugin marketplace add yjl9903/AnimeGarden
claude plugin install animegarden@animegarden
```

安装后打开新会话，直接输入：

> 使用 AnimeGarden 查找上伊那牡丹第一话资源

## 使用 Skills

**Anime Garden skill**: 用于从 Anime Garden 上检索动画资源.

使用 Vercel skills CLI 添加 [Anime Garden skill](https://skills.sh/yjl9903/animegarden/animegarden).

```bash
npx skills add https://github.com/yjl9903/AnimeGarden --skill animegarden
```

## 使用 MCP

Anime Garden MCP 服务端点: `https://api.animes.garden/mcp`.

例如，在 Claude Code 的 MCP 配置中添加：

```json
{
  "mcpServers": {
    "animegarden": {
      "type": "http",
      "url": "https://api.animes.garden/mcp"
    }
  }
}
```

## 使用开放 API

```bash
curl "https://api.animes.garden/resources?page=1&pageSize=10"
```

你可以在[这里](https://animes.garden/docs/api)找到交互式的 Open API 文档, 以及在本仓库的 [examples/api.http](./examples/api.http) 文件内查看到更多 API 用例.

你也可以直接使用网站, 在资源列表页 (例如 [上伊那牡丹 最新资源](https://animes.garden/resources/1?subject=543360&fansub=%E5%96%B5%E8%90%8C%E5%A5%B6%E8%8C%B6%E5%B1%8B&keyword=%E7%AE%80%E6%97%A5)) 直接复制生成的 cURL、JavaScript 和 Python 的 API 请求代码.

如果你正在使用 JavaScript 和 TypeScript 进行开发, 那么你可以直接使用 npm 包 [@animegarden/client](https://www.npmjs.com/package/@animegarden/client), 它是对这些 API 请求的上层封装.

## 使用 npm 包

> 支持 Node.js 24+ 或提供标准 Fetch API 的浏览器环境.

它是 [AnimeGarden](https://animes.garden) 的 JavaScript / TypeScript 的 API 客户端封装.

```bash
npm i @animegarden/client
```

示例:

```ts
import { fetchResources } from '@animegarden/client';

// Fetch the first page of resources
const result = await fetchResources();
if (!result.ok) {
  throw result.error;
}

console.log(result.resources);

// Fetch matching resources across pages
const botan = await fetchResources({
  count: -1,
  subject: 543360,
  fansub: '喵萌奶茶屋',
  keywords: ['简日']
});

if (!botan.ok) {
  throw botan.error;
}

console.log(botan.resources);
```

更多程序示例见 [./examples/](https://github.com/yjl9903/AnimeGarden/blob/main/examples/).

常用筛选条件（取交集）：

| 字段 | 筛选逻辑 |
| --- | --- |
| `subjects` | 按 Bangumi 条目 ID 筛选，多个 ID 匹配任意一个. |
| `fansubs` / `publishers` | 分别按字幕组或发布者名称筛选，匹配任意一个；同时设置时满足任一条件即可. |
| `search` | 按番剧名或关键词搜索标题；设置后忽略 `include`. |
| `include` | 标题包含任意一个指定词，可用于按番剧名搜索. |
| `keywords` | 标题包含全部指定词，例如 `['1080p', '简日']`. |
| `exclude` | 排除标题包含任意一个指定词的资源. |
| `after` / `before` | 限定发布时间范围，包含边界时间. |

`fetchResources()` 成功返回时，包含以下字段：

| 字段 | 含义 |
| --- | --- |
| `ok` | `true` 表示请求成功. |
| `resources` | 匹配的资源数组，去重后按发布时间从新到旧排序. |
| `pagination` | 最后取得的页码 `page`、每页条数 `pageSize`；`complete: true` 表示没有下一页. |
| `filter` | 服务端解析后实际使用的筛选条件. |
| `timestamp` | 首次成功响应的时间. |

## 使用内嵌代码

你可以从资源搜索页复制出网页嵌入代码，放到你的博客等各种页面中.

```html
<iframe src="https://animes.garden/iframe?subject=543360" width="100%" height="600" frameborder="0"></iframe>
```

## 本地开发

参考 [CONTRIBUTING.md](./CONTRIBUTING.md) 中的描述配置环境和开始开发.

## 相关项目

+ [AnimeSpace](https://github.com/yjl9903/AnimeSpace): Keep following your favourite anime
+ [anipar](https://github.com/yjl9903/AnimeGarden/tree/main/packages/anipar): Parse structure metadata from resource's title.
+ [bgmx](https://github.com/yjl9903/bgmx): Bangumi Data / API Clients

## 鸣谢

+ [動漫花園](https://share.dmhy.org/)
+ [蜜柑计划](https://mikanani.me/)
+ [萌番组](https://bangumi.moe/)
+ [Bangumi 番组计划](https://bgm.tv/)
+ [bangumi-data](https://github.com/bangumi-data/bangumi-data)

## 开源协议

AGPL-3.0 License © 2023 [XLor](https://github.com/yjl9903)
