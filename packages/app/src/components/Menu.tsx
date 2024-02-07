import {
  Cloud,
  CreditCard,
  Github,
  Keyboard,
  LifeBuoy,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  PlusCircle,
  Settings,
  User,
  UserPlus,
  Users,
  PlusIcon,
  MoreVertical,
  Book,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

import { navigate } from 'astro:transitions/client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';

export function Menu() {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-light-100 hover:bg-light-400 hover:bg-op-100 h-12 w-12"
        >
          <PlusIcon className="h-8 w-8" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent forceMount className="w-56">
        <DropdownMenuLabel className="font-quicksand font-bold select-none">
          Anime Garden
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* <DropdownMenuGroup>
          <DropdownMenuItem>
            <Users className="mr-2 h-4 w-4" />
            <span>Team</span>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <UserPlus className="mr-2 h-4 w-4" />
              <span>Invite users</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem>
                  <Mail className="mr-2 h-4 w-4" />
                  <span>Email</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>Message</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span>More...</span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuItem>
            <Plus className="mr-2 h-4 w-4" />
            <span>New Team</span>
            <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup> */}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => window.open(`https://github.com/yjl9903/AnimeGarden`)}>
          <span className="i-devicon-github mr-2 h-4 w-4" />
          <span>GitHub</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            window.open(
              `https://github.com/yjl9903/AnimeGarden/issues/new?assignees=&labels=bug&projects=&template=bug_report.yml`
            )
          }
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>问题反馈</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate(`/docs/api`)}>
          <Cloud className="mr-2 h-4 w-4" />
          <span>API 文档</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate(`/docs/api`)} disabled>
          <Book className="mr-2 h-4 w-4" />
          <span>帮助</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => window.open(`https://share.dmhy.org/`)}>
          <ExternalLink className="mr-2 h-4 w-4" />
          <span>动漫花园</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
