import { navigate } from 'astro:transitions/client';

import {
  useFloating,
  offset,
  flip,
  shift,
  useDismiss,
  useRole,
  useClick,
  useInteractions,
  FloatingFocusManager,
  useId,
  type FloatingContext,
  type ReferenceType,
  type ElementProps,
  type Placement
} from '@floating-ui/react';

import { useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import { Book, Cloud, ExternalLink, HelpCircle, PlusIcon, Star, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { collectionsAtom, currentCollectionNameAtom } from '@/state';

import { useDraggable } from './hooks/draggable';

const openCollectionAtom = atomWithStorage(
  'animegarden:open_collection',
  false,
  createJSONStorage(() => sessionStorage)
);

const collectionPosAtom = atomWithStorage(
  'animegarden:open_collection',
  { x: 0, y: 0 },
  createJSONStorage(() => sessionStorage)
);

export function Menu() {
  return (
    <Popover>
      <Dropdown></Dropdown>
    </Popover>
  );
}

function Dropdown() {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useAtom(collectionsAtom);
  const [curCollectionName, setCurCollectionName] = useAtom(currentCollectionNameAtom);
  const setOpenCollection = useSetAtom(openCollectionAtom);

  const openCollection = (name: string) => {
    setCurCollectionName(name);
    setOpenCollection((value) => !value);
  };

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
      <DropdownMenuContent forceMount className="w-56" collisionPadding={8}>
        <DropdownMenuLabel className="font-quicksand font-bold select-none">
          Anime Garden
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {collections.map((collection) => (
            <DropdownMenuItem
              key={collection.name}
              onSelect={() => openCollection(collection.name)}
              disabled
            >
              <Star className="mr-2 h-4 w-4"></Star>
              <span>{collection.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
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

function Popover(props: { children: React.ReactNode }) {
  const { children } = props;

  const [isOpen, setIsOpen] = useAtom(openCollectionAtom);
  const initialPlacement: Placement = 'top-start';

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: (open) => {
      setIsOpen(open);
    },
    strategy: 'fixed',
    placement: initialPlacement,
    middleware: [offset(10), shift({ mainAxis: true, crossAxis: true })]
  });
  const closePopover = () => {
    setIsOpen(false);
  };

  // const click = useClick(context);
  // const dismiss = useDismiss(context);
  // const role = useRole(context);
  const draggable = useDraggable(context, initialPlacement);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    // click,
    // dismiss,
    // role,
    draggable
  ]);

  const headingId = useId();
  const currentCollections = useAtomValue(currentCollectionNameAtom);

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()}>
        {children}
      </div>
      {isOpen && (
        <FloatingFocusManager context={context} modal={false} closeOnFocusOut={false}>
          <div
            className="popover border rounded-md bg-white"
            ref={refs.setFloating}
            style={floatingStyles}
            aria-labelledby={headingId}
            {...getFloatingProps()}
          >
            <div id={headingId} className="px4 py2 border-b flex">
              <span className="font-bold select-none cursor-move">{currentCollections}</span>
              <span className="flex-auto"></span>
              <Button
                variant="link"
                size="icon"
                className="bg-light-100 hover:bg-light-400 hover:bg-op-100 h-6 w-6"
                onClick={closePopover}
              >
                <X className="h-4 w-4 text-red" />
              </Button>
            </div>
            <div className="px4 py2">
              <textarea placeholder="Write your review..." />
            </div>
          </div>
        </FloatingFocusManager>
      )}
    </>
  );
}
