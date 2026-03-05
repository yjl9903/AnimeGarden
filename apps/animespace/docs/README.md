# AnimeSpace Docs Index

本文档是 `apps/animespace/docs` 的目录索引，用于快速定位“当前实现快照”与“目标设计文档”。

## 文档分层

1. 当前实现快照（以 `apps/animespace/src` 代码为准）
   - `1-data-structure-design.md`
   - `2-animegarden-source-manager.md`
   - `3-subject-source.md`
   - `4-preference-naming.md`
2. 目标设计与规划
   - `5-pull-push-watch-design.md`
   - `6-downloader-design.md`
3. 设计-实现差异清单
   - `7-design-implementation-gap.md`

## 文档目录

1. `1-data-structure-design.md`
   - v3 当前实现快照：space 加载、subject/source/naming、sqlite、校验规则与当前边界。
2. `2-animegarden-source-manager.md`
   - AnimeGarden source manager 当前实现：初始化、缓存命中、同步策略、与 system 集成。
3. `3-subject-source.md`
   - subject source 模块当前实现：source 解析、filter 归一化、rewrite/order、抓取与提取。
4. `4-preference-naming.md`
   - preference 与 naming 当前实现：继承优先级、模板渲染、已知行为差异。
5. `5-pull-push-watch-design.md`
   - pull / push / watch 目标设计：系统分层、任务流、并发策略、配置与迁移建议、测试验收。
6. `6-downloader-design.md`
   - downloader 细化设计：qBittorrent 配置、状态机、调度与并发、与 push/watch 协作协议。
7. `7-design-implementation-gap.md`
   - 目标设计与当前代码差异汇总：命令参数、调度行为、模块边界与 downloader API 差异。

## 推荐阅读顺序

1. 先读 `1-data-structure-design.md` 了解当前基线。
2. 再读 `2-animegarden-source-manager.md` 与 `3-subject-source.md` 理解资源获取与提取路径。
3. 读 `4-preference-naming.md` 明确配置继承与命名细节。
4. 读 `5-pull-push-watch-design.md` 与 `6-downloader-design.md` 对齐目标设计。
5. 最后读 `7-design-implementation-gap.md` 了解当前实现与目标设计的差距与优先级。
