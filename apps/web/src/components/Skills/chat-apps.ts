import { skillURL } from '../../pages/skills/content';

/** Distinguishes prompt-prefilling links from apps that require clipboard handoff. */
export interface ChatAppLink {
  name: string;
  icon: string;
  href: string;
  mode: 'prefill' | 'copy';
  /** The final prompt used by both URL prefill and clipboard handoff. */
  prompt: string;
}

/** App destinations remain independent of the Skill URL used in their prompts. */
const chatApps = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    mode: 'prefill',
    icon: 'i-simple-icons-openai',
    href: (prompt: string) =>
      `https://chatgpt.com/?${new URLSearchParams({ surface: 'work', prompt })}`
  },
  {
    id: 'codex',
    name: 'Codex',
    mode: 'prefill',
    icon: 'i-devicon-codex?mask',
    href: (prompt: string) => `codex://new?${new URLSearchParams({ prompt })}`
  },
  {
    id: 'claude',
    name: 'Claude',
    mode: 'prefill',
    icon: 'i-simple-icons-claude',
    href: (prompt: string) => `https://claude.ai/new?${new URLSearchParams({ q: prompt })}`
  },
  {
    id: 'cursor',
    name: 'Cursor',
    mode: 'prefill',
    icon: 'i-simple-icons-cursor',
    href: (prompt: string) =>
      `https://cursor.com/link/prompt?${new URLSearchParams({ text: prompt })}`
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    mode: 'copy',
    icon: 'i-simple-icons-deepseek',
    href: 'https://chat.deepseek.com/'
  },
  {
    id: 'doubao',
    name: '豆包',
    mode: 'copy',
    icon: 'chat-app-icon-doubao',
    href: 'https://www.doubao.com/chat/'
  },
  {
    id: 'qwen',
    name: '千问',
    mode: 'copy',
    icon: 'i-simple-icons-qwen',
    href: 'https://www.qianwen.com/chat/workbench'
  },
  {
    id: 'kimi',
    name: 'Kimi',
    mode: 'copy',
    icon: 'i-simple-icons-kimi chat-app-icon-kimi',
    href: 'https://www.kimi.com/'
  },
  {
    id: 'yuanbao',
    name: '元宝',
    mode: 'copy',
    icon: 'i-mingcute-yuanbao-fill',
    href: 'https://yuanbao.tencent.com/'
  },
  {
    id: 'qingyan',
    name: '智谱清言',
    mode: 'copy',
    icon: 'chat-app-icon-qingyan',
    href: 'https://chatglm.cn/'
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    mode: 'copy',
    icon: 'i-simple-icons-minimax',
    href: 'https://agent.minimax.cn/'
  }
] as const;

/** Stable platform identifiers for per-app Skill link configuration. */
export type ChatAppId = (typeof chatApps)[number]['id'];

const githubSkillURL =
  'https://github.com/yjl9903/AnimeGarden/blob/main/skills/animegarden/SKILL.md';

/** Unconfigured apps use the shared Skill URL shown on the Skills page. */
export const chatAppSkillURLs: Partial<Record<ChatAppId, string>> = {
  deepseek: githubSkillURL,
  qingyan: 'https://raw.githubusercontent.com/yjl9903/AnimeGarden/main/skills/animegarden/SKILL.md',
  yuanbao: githubSkillURL
};

/** Resolves the platform's Skill link before constructing its URL or clipboard prompt. */
export function getChatAppLinks(
  prompt: string,
  skillURLs: Partial<Record<ChatAppId, string>> = chatAppSkillURLs
): ChatAppLink[] {
  // Temporarily hide Yuanbao while its search results are unreliable; keep its configuration.
  return chatApps
    .filter((app) => app.id !== 'yuanbao')
    .map((app) => {
      const appSkillURL = skillURLs[app.id] ?? skillURL;
      // Replace only the generated Skill mention, leaving user text and other links intact.
      const appPrompt = prompt.replaceAll(
        `[AnimeGarden](${skillURL})`,
        () => `[AnimeGarden](${appSkillURL})`
      );
      return {
        name: app.name,
        icon: app.icon,
        mode: app.mode,
        prompt: appPrompt,
        href: typeof app.href === 'function' ? app.href(appPrompt) : app.href
      };
    });
}
