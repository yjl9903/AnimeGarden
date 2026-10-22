export const skillURL =
  'https://raw.githubusercontent.com/yjl9903/AnimeGarden/main/skills/animegarden/SKILL.md';

export const skillPrompt = `使用 [AnimeGarden](${skillURL}) 查找上伊那牡丹第一话资源`;

/** A setup choice contains either a terminal command or a prompt sent to an Agent. */
export interface SetupOption {
  id: string;
  name: string;
  content: string;
  kind: 'command' | 'prompt';
}

export const skillOptions: readonly SetupOption[] = [
  {
    id: 'online',
    name: '直接使用',
    content: skillPrompt,
    kind: 'prompt'
  },
  {
    id: 'local',
    name: '安装 Skill',
    content: 'npx skills add https://github.com/yjl9903/AnimeGarden --skill animegarden',
    kind: 'command'
  }
];

/** Remote MCP setup commands verified against each client's CLI help. */
export const mcpOptions: readonly SetupOption[] = [
  {
    id: 'codex',
    name: 'Codex',
    content: 'codex mcp add animegarden --url https://api.animes.garden/mcp',
    kind: 'command'
  },
  {
    id: 'claude',
    name: 'Claude Code',
    content:
      'claude mcp add --transport http --scope user animegarden https://api.animes.garden/mcp',
    kind: 'command'
  }
];

/** Plugin installation commands mirror the repository README. */
export const pluginOptions: readonly SetupOption[] = [
  {
    id: 'codex',
    name: 'Codex',
    content:
      'codex plugin marketplace add yjl9903/AnimeGarden\ncodex plugin add animegarden@animegarden',
    kind: 'command'
  },
  {
    id: 'claude',
    name: 'Claude Code',
    content:
      'claude plugin marketplace add yjl9903/AnimeGarden\nclaude plugin install animegarden@animegarden',
    kind: 'command'
  }
];

export const examples = [
  {
    title: '找一部动画',
    prompt: '使用 AnimeGarden 查找上伊那牡丹第一话资源'
  },
  {
    title: '按字幕组筛选',
    prompt: '使用 AnimeGarden 查找喵萌奶茶屋发布的上伊那牡丹资源，按发布时间从新到旧排列。'
  },
  {
    title: '看看最近发布',
    prompt: '使用 AnimeGarden 看看最近发布的动画资源，按发布时间从新到旧排列。'
  }
];

/** Specs extracted from resource titles and file lists verified on 2026-10-23. */
export const demoResources = [
  {
    provider: 'dmhy',
    providerId: '716882',
    fansub: '千夏字幕组',
    specs: '1080p · AVC · 简体 · MP4',
    size: '232.90 MB',
    magnet: 'magnet:?xt=urn:btih:DGGCBVK5HAX3UIAEQW3WS22SDPR5L36F'
  },
  {
    provider: 'dmhy',
    providerId: '716633',
    fansub: '喵萌奶茶屋',
    specs: '1080p · 简日双语 · MP4',
    size: '411.50 MB',
    magnet: 'magnet:?xt=urn:btih:AVXUXZOH3IKKI4OFNOAVRLMSFUSJYWPE'
  }
];

/** Shared page metadata for HTML and Markdown responses. */
export const skillsPageMetadata = {
  title: '使用 Skills / MCP',
  description:
    '将 AnimeGarden 接入你的 AI 助手，用自然语言搜索动画资源。查看插件安装步骤、Skill 配置和使用示例。'
};
