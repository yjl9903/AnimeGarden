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

## 排查边界

排查线上可用性时，需要分别观察：

- `animegarden-web-production`：页面请求、SSR、静态资源、Web 健康检查。
- `animegarden-server-production`：Web 内网后端、资源查询、详情查询、cron RPC 相关链路。
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
