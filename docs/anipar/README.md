# anipar 文档索引

本目录记录 `packages/anipar` 的解析行为审计、测试资产复查和后续修复方向。

## 文档列表

| 文档 | 内容 | 适用场景 |
| --- | --- | --- |
| [parse-result-title-audit.md](./parse-result-title-audit.md) | 测试资产中 `title` / `titles` 字段的专项复查 | 修改标题拆分、别名提取、方括号边界解析时先读 |
| [parse-result-metadata-audit.md](./parse-result-metadata-audit.md) | season、type、subtitle、file 等非标题元数据复查 | 修改元数据归一化、字幕格式、季信息或类型识别时先读 |

## 维护约定

- 标题字段问题继续记录在标题专项文档中。
- season、episode、source、file、subtitle、type 等字段问题记录在元数据文档中。
- 新增测试资产审计时，保留检查日期、范围、代表样例和后续建议。
