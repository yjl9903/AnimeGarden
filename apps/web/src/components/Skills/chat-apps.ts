/** Distinguishes prompt-prefilling links from apps that require clipboard handoff. */
export interface ChatAppLink {
  name: string;
  icon: string;
  href: string;
  mode: 'prefill' | 'copy';
}

/** Builds app destinations and their supported prompt handoff method. */
export function getChatAppLinks(prompt: string): ChatAppLink[] {
  return [
    {
      name: 'ChatGPT',
      mode: 'prefill',
      icon: 'i-simple-icons-openai',
      href: `https://chatgpt.com/?${new URLSearchParams({ surface: 'work', prompt })}`
    },
    {
      name: 'Codex',
      mode: 'prefill',
      icon: 'i-devicon-codex?mask',
      href: `codex://new?${new URLSearchParams({ prompt })}`
    },
    {
      name: 'Claude',
      mode: 'prefill',
      icon: 'i-simple-icons-claude',
      href: `https://claude.ai/new?${new URLSearchParams({ q: prompt })}`
    },
    {
      name: 'Cursor',
      mode: 'prefill',
      icon: 'i-simple-icons-cursor',
      href: `https://cursor.com/link/prompt?${new URLSearchParams({ text: prompt })}`
    },
    {
      name: 'DeepSeek',
      mode: 'copy',
      icon: 'i-simple-icons-deepseek',
      href: 'https://chat.deepseek.com/'
    },
    {
      name: '豆包',
      mode: 'copy',
      icon: 'chat-app-icon-doubao',
      href: 'https://www.doubao.com/chat/'
    },
    {
      name: 'Kimi',
      mode: 'copy',
      icon: 'i-simple-icons-kimi chat-app-icon-kimi',
      href: 'https://www.kimi.com/'
    },
    { name: '千问', mode: 'copy', icon: 'i-simple-icons-qwen', href: 'https://www.qianwen.com/' },
    {
      name: '元宝',
      mode: 'copy',
      icon: 'i-mingcute-yuanbao-fill',
      href: 'https://yuanbao.tencent.com/'
    }
  ];
}
