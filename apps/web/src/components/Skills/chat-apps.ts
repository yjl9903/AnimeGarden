/** Builds web and desktop app links with the complete prompt prefilled. */
export function getChatAppLinks(prompt: string) {
  return [
    {
      name: 'ChatGPT',
      icon: 'i-simple-icons-openai',
      href: `https://chatgpt.com/?${new URLSearchParams({ surface: 'work', prompt })}`
    },
    {
      name: 'Codex',
      icon: 'i-devicon-codex?mask',
      href: `codex://new?${new URLSearchParams({ prompt })}`
    },
    {
      name: 'Claude',
      icon: 'i-simple-icons-claude',
      href: `https://claude.ai/new?${new URLSearchParams({ q: prompt })}`
    },
    {
      name: 'Cursor',
      icon: 'i-simple-icons-cursor',
      href: `https://cursor.com/link/prompt?${new URLSearchParams({ text: prompt })}`
    }
  ];
}
