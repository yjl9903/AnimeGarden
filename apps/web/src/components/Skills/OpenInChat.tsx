import { ChevronDown, ExternalLink } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu';

import { getChatAppLinks } from './chat-apps';

/** Opens a chosen chat app with the complete prompt, retaining native link behavior. */
export function OpenInChat({ prompt }: { prompt: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-base bg-transparent px-2.5 py-1 text-sm text-base-500 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-pink-600"
          aria-label="在聊天应用中打开"
        >
          打开 <ChevronDown size={14} aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        {getChatAppLinks(prompt).map((app) => (
          <DropdownMenuItem key={app.name} asChild>
            <a
              href={app.href}
              target="_blank"
              rel="noopener noreferrer"
              className="gap-2 cursor-pointer"
            >
              <span className={`${app.icon} h-4 w-4 shrink-0`} aria-hidden="true" />在 {app.name}{' '}
              中打开
              <ExternalLink size={12} className="ml-auto opacity-50" aria-hidden="true" />
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
