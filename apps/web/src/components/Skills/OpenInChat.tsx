import { ChevronDown, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { trackSkillsChatOpen, type TrackSkillsChatOpenPayload } from '~/utils/umami';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu';

import { getChatAppLinks, type ChatAppLink } from './chat-apps';
import { copyPromptAndOpen } from './copy-and-open';
import './chat-app-icons.css';

/** Opens a chosen chat app with the complete prompt, retaining native link behavior. */
export function OpenInChat({
  prompt,
  source,
  example
}: { prompt: string } & Omit<TrackSkillsChatOpenPayload, 'app'>) {
  async function copyAndOpen(app: ChatAppLink) {
    try {
      await copyPromptAndOpen(app.prompt, app.href);
      trackSkillsChatOpen({ app: app.name, source, example });
      toast.success(`已复制提示词，请粘贴到 ${app.name}`);
    } catch {
      toast.error('复制失败，请先手动复制提示词');
    }
  }

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
      <DropdownMenuContent
        align="start"
        className="min-w-48 max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto"
      >
        {getChatAppLinks(prompt).map((app) =>
          app.mode === 'copy' ? (
            <DropdownMenuItem
              key={app.name}
              className="gap-2 cursor-pointer"
              onSelect={() => {
                void copyAndOpen(app);
              }}
            >
              <span className={`${app.icon} h-4 w-4 shrink-0`} aria-hidden="true" />
              复制并打开 {app.name}
              <ExternalLink size={12} className="ml-auto opacity-50" aria-hidden="true" />
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={app.name} asChild>
              <a
                href={app.href}
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2 cursor-pointer"
                onClick={() => trackSkillsChatOpen({ app: app.name, source, example })}
                onAuxClick={(event) => {
                  if (event.button === 1) {
                    trackSkillsChatOpen({ app: app.name, source, example });
                  }
                }}
              >
                <span className={`${app.icon} h-4 w-4 shrink-0`} aria-hidden="true" />在 {app.name}{' '}
                中打开
                <ExternalLink size={12} className="ml-auto opacity-50" aria-hidden="true" />
              </a>
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
