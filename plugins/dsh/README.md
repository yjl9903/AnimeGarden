# AnimeGarden for DeepSeek Harness

在 DeepSeek Harness 里搜索 Anime Garden 的动画 BT 资源。

- **会话搜索**：让模型按番剧、字幕组、类型或时间范围找资源，返回带详情、播放和下载链接的列表。
- **搜索面板**：输入即搜、滚动加载，可按字幕组和类型筛选。
- **周历浏览**：按星期查看当季动画，悬停星期快捷项可预览当日动画，点击即可在面板内筛选。

## 安装

在 Harness 的 Plugins 页面安装 `dsh-plugin-animegarden`，安装后侧边栏会出现 Anime Garden 入口。

## 使用

- **让模型找资源**：直接描述需求，例如「使用 AnimeGarden 查找上伊那牡丹第一话资源」，字幕组、时间范围等条件用自然语言说明即可。
- **搜索面板**：点击侧边栏图标打开，搜索即可；工具栏可切换周历并按字幕组 / 类型筛选。

## 配置

默认使用公开 API，无需配置；自建服务可在 [cordis.patch.yml](./cordis.patch.yml) 中修改 `baseURL`。

## 许可证

AGPL-3.0 License © 2023 [XLor](https://github.com/yjl9903)

标题字体使用 Quicksand（SIL Open Font License 1.1）
