/** Builds prompt links using the same web entry points as Fumadocs' Open menu. */
export function getChatAppLinks(prompt: string) {
  return [
    {
      name: 'ChatGPT',
      icon: 'i-simple-icons-openai',
      href: `https://chatgpt.com/?${new URLSearchParams({ prompt, hints: 'search' })}`
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
