# 线上部署拓扑

检查日期：2026-06-12

## 域名与服务

生产环境全部部署在 Fly.io。当前域名、Fly app 和代码目录关系如下：

| 入口                                            | Fly app                         | 代码目录      | 暴露范围 | 说明                                                         |
| ----------------------------------------------- | ------------------------------- | ------------- | -------- | ------------------------------------------------------------ |
| `https://animes.garden`                         | `animegarden-web-production`    | `apps/web`    | 公网     | 网站页面入口，运行 Web app                                   |
| `http://animegarden-server-production.flycast/` | `animegarden-server-production` | `apps/server` | Fly 内网 | Web app 通过内网 RPC / HTTP 调用的后端服务，不直接对公网暴露 |
| `https://api.animes.garden`                     | `animegarden-feed-production`   | `apps/server` | 公网     | 独立 public API 服务                                         |

## Web 配置关系

`apps/web/fly.toml` 的线上构建参数表达了页面服务端和浏览器公开入口：

- `WEB_SERVER_URL` 指向 `animegarden-server-production.flycast`，供 Web app 服务端渲染和 loader 访问内网后端。
- `FEED_HOST` 指向 `api.animes.garden`，用于浏览器侧和页面展示的公开 API / feed 地址。

## 前端发布后的 CDN 缓存清理

`.github/workflows/deploy-fly.yml` 的 production Web job
使用 `.node-version` 和 `package.json` 中的 pnpm 版本安装冻结锁文件的依赖，
在 `flyctl deploy` 成功后通过项目内的 `pnpm exec cf cache purge` 清理
`animes.garden` 页面路径的 CDN 缓存。`cf` 版本由根 `package.json` 和
`pnpm-lock.yaml` 统一管理。

- 首页 `https://animes.garden/` 按完整 URL 清理，不使用根路径前缀。
- `/resources`、`/subject`、`/detail`、`/calendar`、`/collection`、`/anime`、
  `/about`、`/iframe`、`/docs/api` 按路径前缀清理，包括这些路径的查询参数变体。
- `/assets/` 下的 JS/CSS、图片等静态资源保留缓存。新增页面路径时同步更新工作流中的前缀列表。

GitHub 仓库的 Settings → Secrets and variables → Actions 需要配置：

| 类型 | 名称 | 内容 |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | 具有目标 Zone 的 `Cache Purge` 权限的 API Token |
| Variable | `CLOUDFLARE_ZONE_ID` | `animes.garden` 所属 Zone 的 ID |

清理失败时 job 报错，但不会自动回滚已完成的 Fly 部署。
test 环境和 server/feed job 不执行清理。Web job 不取消正在执行的发布，确保后续发布
不会中断当前发布的缓存清理步骤。

清理范围不包含 `api.animes.garden` 等其他 hostname，也无法移除用户浏览器已经保存的缓存。
404 等错误响应仍需正确配置 `no-store`，静态资源在版本切换期间仍需保持可用。

## 排查边界

服务监控地址：[status.animes.garden](https://status.animes.garden/)，网站页脚的「监控」入口指向此地址。

排查线上可用性时，需要分别观察：

- `animegarden-web-production`：页面请求、SSR、静态资源、Web 健康检查。
- `animegarden-server-production`：Web 内网后端、资源查询、详情查询、cron RPC 相关链路；health check timeout 为 30 秒，避免慢查询高峰时 10 秒探活误判。
- `animegarden-feed-production`：`api.animes.garden` public API 和 feed 链路。

常用 Fly CLI 只读命令：

```bash
fly status --app animegarden-web-production
fly status --app animegarden-server-production
fly status --app animegarden-feed-production
fly checks list --app animegarden-web-production
fly logs --app animegarden-web-production --no-tail
fly logs --app animegarden-server-production --no-tail
fly logs --app animegarden-feed-production --no-tail
```
