# 插件接入与发布

AnimeGarden 插件将资源搜索 skill 与公开 MCP 服务一起安装，支持 Codex、Cursor、Claude Code 和 Antigravity。插件按 [AGPL-3.0](../../skills/animegarden/LICENSE.txt) 分发。

安装入口见[仓库首页](../../README.md#使用插件)，插件用法见[包内 README](../../plugins/agents/README.md)。本文记录开发、同步和发布流程。

## 内容与格式边界

所有源码、完整插件包和市场入口均位于 `yjl9903/AnimeGarden` 的主分支。Codex 和 Cursor 复用 `plugins/agents/`；Claude Code 使用 `plugins/claude/`；Antigravity 使用 `plugins/antigravity/`。无需额外仓库或发布分支。

| 内容                                       | 维护位置                     | 生成位置                                               |
| ------------------------------------------ | ---------------------------- | ------------------------------------------------------ |
| skill、references、skill UI 元数据与许可证 | `skills/animegarden/`        | 三个包的 `skills/animegarden/`；许可证另复制到包根目录 |
| 插件名称、版本、作者等                     | `plugins/agents/plugin.json` | 各适配 manifest 支持的字段                             |
| 插件展示图标 | `apps/web/public/pwa-512x512.png` | `plugins/agents/assets/icon.png` |
| 远程 MCP 定义                              | `plugins/agents/mcp.json`    | 各平台 MCP 配置                                        |
| 包内用户说明                              | `plugins/agents/README.md` | `plugins/claude/README.md` |
| 平台转换和市场条目                         | `scripts/package-plugins.ts` | 三个包、三个 marketplace 入口                          |

各包共用同一 skill 和 MCP 服务，配置格式分别为：

| 包            | Manifest                                                | MCP 配置                                   |
| ------------- | ------------------------------------------------------- | ------------------------------------------ |
| `agents`      | `plugin.json`（Agent Plugins 1.0.0）                    | `mcp.json`：`type: streamable-http`、`url` |
| `claude`      | `.claude-plugin/plugin.json`                            | `.mcp.json`：`type: http`、`url`           |
| `antigravity` | `plugin.json`（仅输出已文档化的 `name`、`description`） | `mcp_config.json`：`serverUrl`             |

插件包自包含，不使用指向包外的符号链接。发布副本作为可安装内容随主分支提交；ZIP 和其他构建文件保留在忽略的 `dist/` 中。

OpenAI 插件展示字段放在 `plugins/agents/plugin.json` 的 `extensions.com.openai.interface`：`displayName` 为 `AnimeGarden`，`logo` 和 `composerIcon` 引用包内樱花图标。同步到 Claude manifest 时去掉平台专属 `extensions`。MCP 配置键保持 `animegarden`；当前 Codex 桌面端详情页会将其首字母大写为 `Animegarden`，该行与插件展示名独立，并复用插件 logo。

只修改表中的维护源，再通过同步脚本生成各包内容。开发、维护和发布流程维护在本文，不另建 `plugins/README.md`。包内用户说明维护在 [agents README](../../plugins/agents/README.md)，同步到 claude 包，不手工维护多份；Antigravity 暂不生成 README。

包内 README 面向安装前了解插件和安装后使用插件的读者，只介绍功能、使用示例和必要配置。各客户端安装命令放在仓库首页；平台如何使用发布内容见下文“官方目录收录”。

市场发现入口由客户端规定，放在仓库根目录并由同步脚本生成：

| 入口                               | 指向的包                    |
| ---------------------------------- | --------------------------- |
| `.agents/plugins/marketplace.json` | `plugins/agents/`（Codex）  |
| `.cursor-plugin/marketplace.json`  | `plugins/agents/`（Cursor） |
| `.claude-plugin/marketplace.json`  | `plugins/claude/`           |

Antigravity 使用独立适配包，官方市场收录流程见下文。

## 维护与验证

在仓库根目录执行，Node.js 24+；归档还需要 `zip`（macOS 与 GitHub Ubuntu runner 通常已提供）。

```sh
pnpm plugins:sync
pnpm plugins:check
claude plugin validate --strict ./plugins/claude
claude plugin validate --strict .
pnpm plugins:pack
```

- `plugins:sync` 从共享源同步 skill、许可证、包内 README、适配 manifest 和市场清单，也删除已从维护源移除的旧 skill 文件。
- `plugins:check` 不修改文件，内容不同步时退出失败。CI 会执行此检查。
- 脚本拒绝包内符号链接及非预期文件，避免把本地文件混入归档。当前适配器只支持一个公开 HTTPS Streamable HTTP MCP；新增认证或其他传输时需同步扩展转换逻辑。
- `plugins:pack` 先检查一致性，再生成三个 ZIP 和 SHA256 校验和；每个 ZIP 的 manifest 都在归档根目录，不带外层 `plugins/` 前缀。Antigravity manifest 不添加未文档化的版本字段；归档文件名使用统一版本。
- 同步检查与清单检查不能替代客户端验收。首次发布和适配配置变更后，在 Claude、Codex、Cursor、Antigravity 中各验证一次普通搜索、REST 分页、详情回退，以及未安装 PikPak 时仍可搜索。

`pnpm install` 通过 `prepare` 自动启用 Husky。提交涉及 skill、插件包、同步脚本或市场入口时，`.husky/pre-commit` 自动运行同步和检查，并将生成文件加入暂存区。提交前先将全部维护源改动加入暂存区，或用 `git stash` 收起暂不提交的改动；若维护源仍有未暂存的改动，hook 会停止，避免把这些改动生成到本次提交中。其他提交不运行插件同步。

现有 CI 保留 `plugins:check` 作为兜底。归档通过本地 `pnpm plugins:pack` 生成，不使用独立打包 workflow；hook 不生成 ZIP、不发布 Release，也不提交市场审核。

## 主分支发布流程

1. 修改 `skills/animegarden/` 或标准包配置。
2. 递增 `plugins/agents/plugin.json` 的版本，暂存维护源修改并提交；pre-commit 自动同步、检查并暂存生成文件。也可先手动运行同步和检查。只编辑共享源，不手改生成副本。
3. 将源文件、生成的适配包和市场入口一起合入主分支。固定的 marketplace 名称为 `animegarden`，插件名为 `animegarden`。
4. Codex 和 Claude Code 用户可通过本仓库的 marketplace 安装。官方市场收录仍需按下文单独提交；需要 ZIP 时执行 `pnpm plugins:pack`。
5. 每次发布都递增版本；不要只推送内容而保持相同版本。回滚时恢复旧内容并发布更高的补丁版本。

## 官方目录收录

GitHub marketplace 分发与官方市场收录分别管理：

- **OpenAI / Codex / ChatGPT**：将 agents ZIP 上传 [Plugins](https://platform.openai.com/plugins)。[市场展示内容](https://developers.openai.com/plugins/deploy/submission)使用 `plugin.json` 的 `extensions.com.openai.interface`，不从 README 自动生成。当前包已配置展示名和图标；提交前仍需补齐其他展示字段及门户要求的审核材料。首次提交包含远程 MCP；skills 或元数据更新需要重新上传 ZIP。
- **Cursor**：向 [发布入口](https://cursor.com/marketplace/publish) 提交本仓库，marketplace 条目指向 `plugins/agents`。[提交清单](https://cursor.com/docs/reference/plugins#submission-checklist)要求 README 说明用法与配置，当前包内 README 承担此职责；官方未明确其详情页渲染方式。
- **Anthropic Directory**：在 [开发者门户](https://claude.ai/directory/manage) 提交本仓库，路径 `plugins/claude`，跟踪 `main`。[市场详情从该包的 manifest 和 README 读取](https://claude.com/docs/plugins/submit#submit-a-plugin)，修改后需重新验证并发布新版本。远程 MCP connector 另行提交；Directory 收录与 `claude-plugins-official` 分开。
- **Antigravity Marketplace**：通过 [官方 Marketplace 页面](https://antigravity.google/docs/marketplace/#next-steps) 的收录申请表提交。正式上架后补充用户安装入口。

以上市场提交与 GitHub Release 均不是同步脚本的副作用，需要维护者执行发布步骤。

## MCP Registry 登记

仓库根目录的 [server.json](../../server.json) 保存远程 MCP 的登记元数据，名称为 `garden.animes/animegarden`，端点为 `https://api.animes.garden/mcp`。它独立于客户端插件的 `mcp.json`，无需发布 npm 包；提交该文件不会自动登记。

使用 [官方 DNS 认证流程](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/authentication.mdx#dns-authentication)验证 `animes.garden`。将公钥 TXT 记录放在根域名 `animes.garden`（DNS 后台通常填写 `@`），内容为 `v=MCPv1; k=ed25519; p=<公钥 Base64>`。私钥保存在安全的本地位置，例如已被 Git 忽略的 `.animegarden/mcp-registry/key.pem`，不提交到仓库。

安装 `mcp-publisher`，在仓库根目录校验文件，完成 DNS 登录后手动发布：

```sh
brew install mcp-publisher
mcp-publisher validate server.json
# 按官方流程使用私钥执行 mcp-publisher login dns --domain animes.garden
mcp-publisher publish server.json
curl -fsS 'https://registry.modelcontextprotocol.io/v0.1/servers?search=garden.animes/animegarden'
```

Registry 使用独立于后端的插件发布版本，与 `plugins/agents/plugin.json` 的 `version` 保持一致，首次登记版本为 `0.1.1`。发布前手动将插件版本同步到 `server.json`；登记元数据更新时递增插件版本，并同步后再发布，已发布版本不可覆盖。端点变更时同步更新本文件和插件 MCP 配置。Registry 登记与各客户端官方目录审核分别进行。

## 官方格式依据

- [Agent Plugins：包结构与边界](https://agent-plugins.org/plugin-authors/build-an-agent-plugin)
- [OpenAI：打包与 marketplace](https://developers.openai.com/plugins/build/plugins)
- [OpenAI：公共目录提交](https://developers.openai.com/plugins/deploy/submission)
- [Cursor：格式与多插件仓库](https://cursor.com/docs/reference/plugins)
- [Claude：插件组件](https://code.claude.com/docs/en/plugins/components)
- [Claude：marketplace](https://code.claude.com/docs/en/plugin-marketplaces)
- [Antigravity：插件格式与安装](https://antigravity.google/docs/plugins)
- [Antigravity：MCP 配置](https://antigravity.google/docs/mcp)
