# 🌸 Anime Garden for DeepSeek Harness

[![version](https://img.shields.io/npm/v/dsh-plugin-animegarden?label=dsh-plugin-animegarden&logo=deepseek&logoColor=white&color=4D6BFE)](https://www.npmjs.com/package/dsh-plugin-animegarden)
[![CI](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/dsh-plugin-animegarden)](https://github.com/yjl9903/AnimeGarden/blob/main/LICENSE)

在 DeepSeek Harness 里搜索 Anime Garden 的动画 BT 资源.

- **会话搜索**：让 AI 能搜索 Anime Garden 资源
- **搜索面板**：输入即搜, 可按字幕组和类型筛选动画资源
- **新番周历**：查看当季新番动画, 快速筛选动画资源
- **浮窗播放**：播放链接直接在 DSH 内以浮窗打开, 边看边聊
- **磁力链接打开**：资源行的磁力链接直接唤起系统默认 BT 客户端

## 安装

把下面这句发给你的 DeepSeek Harness:

```text
从 npm 安装最新版 dsh-plugin-animegarden 到当前运行的 DeepSeek Harness
```

也可以手动安装: **Plugins → Add plugin** 输入包名, 或执行 `dsh plugin add dsh-plugin-animegarden`.

安装后, 侧边栏出现 🌸 Anime Garden.

## 配置

插件行为可以在 Loader 行的 `config` 里开关 (默认值如下), 修改后需要重载插件并刷新页面:

```yaml
config:
  baseURL: https://api.animes.garden
  # KeepShare 播放链接用 DSH 内嵌浮窗打开; false 时保持浏览器新标签页
  embeddedPlayback: true
  # 磁力链接交给系统默认 BT 客户端 (面板按钮与会话卡片)
  openMagnet: true
```

从 npm 安装时, 可在 profile 的 `cordis.patch.yml` 里按 id `animegarden` 覆盖 (匹配的 override 会整体替换 `config`, 记得同时写 `baseURL`).

## 更新

暂时不支持自动更新, 先在 **插件 → 已安装插件** 中卸载当前版本, 再按上面的方式安装最新版.

## 许可证

AGPL-3.0 License © 2023 [XLor](https://github.com/yjl9903)
