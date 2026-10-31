// @vitest-environment jsdom
import { act, type ComponentProps, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';

import { FilterOperations } from '../src/pages/resources.($page)/Filter';
import { CollectionItemContent } from '../src/layouts/Sidebar/Collection';
import { getFeedURL } from '../src/utils/url';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('~/stores/hooks', () => ({ useAppStores: () => ({}) }));
vi.mock('@tanstack/react-store', () => ({ useSelector: () => undefined }));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQueries: () => []
}));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({ children }: { children: ReactNode }) => <div>{children}</div>
}));
vi.mock('~/components/Help', () => ({ SearchTooltip: () => null }));
vi.mock('~/components/ui/tooltip', () => {
  const Wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;
  return {
    TooltipProvider: Wrapper,
    Tooltip: Wrapper,
    TooltipTrigger: Wrapper,
    TooltipContent: () => null
  };
});
// Keep the real copy handlers, but expose menu items without portal/focus interactions.
vi.mock('~/components/ui/dropdown-menu', () => {
  const Wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;
  return {
    DropdownMenu: Wrapper,
    DropdownMenuContent: Wrapper,
    DropdownMenuTrigger: Wrapper,
    DropdownMenuSeparator: () => null,
    DropdownMenuItem: ({
      children,
      onSelect,
      onClick,
      asChild
    }: {
      children: ReactNode;
      onSelect?: () => void;
      onClick?: () => void;
      asChild?: boolean;
    }) => (asChild ? <>{children}</> : <button onClick={onSelect ?? onClick}>{children}</button>)
  };
});

const feedURL = 'https://example.com/feed.xml?type=动画';
const resources: NonNullable<ComponentProps<typeof FilterOperations>['resources']> = [
  {
    id: 1,
    provider: 'dmhy',
    providerId: '123',
    title: 'Episode 01',
    href: 'https://example.com/resource',
    type: '动画',
    magnet: 'magnet:?xt=urn:btih:test',
    tracker: '&tr=https://example.com/tracker',
    size: 1024,
    publisher: { id: 2, name: 'Publisher' },
    createdAt: new Date('2026-01-02T03:04:05Z'),
    fetchedAt: new Date('2026-01-02T03:04:05Z')
  }
];
const collection = {
  name: 'My Collection',
  authorization: '',
  filters: [{ name: 'Latest', searchParams: '?type=动画', types: ['动画'] }]
} satisfies ComponentProps<typeof CollectionItemContent>['collection'];

/** Covers every resources-page copy action and the separate sidebar RSS handler. */
const cases = [
  { page: 'resources', label: '复制 RSS 订阅链接', event: 'copy.feed', payload: undefined },
  { page: 'resources', label: '复制所有磁力链接', event: 'copy.magnet-links', payload: undefined },
  { page: 'resources', label: '复制 JSON 数据', event: 'copy.json', payload: undefined },
  {
    page: 'resources',
    label: '复制为 cURL 命令',
    event: 'copy.fetch',
    payload: { language: 'curl' }
  },
  {
    page: 'resources',
    label: '复制为 JavaScript 代码',
    event: 'copy.fetch',
    payload: { language: 'javascript' }
  },
  {
    page: 'resources',
    label: '复制为 Python 代码',
    event: 'copy.fetch',
    payload: { language: 'python' }
  },
  { page: 'resources', label: '复制为网页嵌入代码', event: 'copy.iframe', payload: undefined },
  { page: 'sidebar', label: '复制 RSS 订阅链接', event: 'copy.feed', payload: undefined }
] as const;

describe('resource and collection copy tracking', () => {
  let root: Root;
  let container: HTMLDivElement;
  const send = vi.fn();
  const writeText = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    Object.assign(window, { umami: { track: send } });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    writeText.mockResolvedValue(undefined);
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    Reflect.deleteProperty(window, 'umami');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  /** Renders the production component with only unrelated UI infrastructure mocked. */
  async function render(
    page: 'resources' | 'sidebar',
    props: ComponentProps<typeof FilterOperations> = { feedURL, resources }
  ) {
    await act(async () =>
      root.render(
        page === 'resources' ? (
          <FilterOperations filter={{ types: ['动画'] }} {...props} />
        ) : (
          <CollectionItemContent
            collection={collection}
            item={collection.filters[0]}
            active={false}
          />
        )
      )
    );
  }

  async function click(label: string) {
    const button = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === label
    );
    expect(button).toBeDefined();
    await act(async () => button!.click());
  }

  it('copies the latest filter when the resources reference has not changed', async () => {
    await render('resources', { resources, filter: { types: ['动画'] } });
    const filter = { types: ['合集'] };
    await render('resources', { resources, filter });
    await click('复制 JSON 数据');

    expect(writeText).toHaveBeenCalledExactlyOnceWith(
      JSON.stringify({ filter, resources }, null, 2)
    );
    expect(send).toHaveBeenCalledExactlyOnceWith('copy.json', undefined);
    expect(toast.success).toHaveBeenCalledOnce();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it.each(cases)(
    '$page: $label sends exactly one event after success',
    async ({ page, label, event, payload }) => {
      await render(page);
      await click(label);

      expect(writeText).toHaveBeenCalledOnce();
      expect(send).toHaveBeenCalledExactlyOnceWith(event, payload);
      expect(toast.success).toHaveBeenCalledOnce();
      expect(toast.error).not.toHaveBeenCalled();
      if (event === 'copy.feed') {
        expect(writeText).toHaveBeenCalledWith(
          page === 'resources' ? feedURL : getFeedURL(collection.filters[0].searchParams)
        );
      }
    }
  );

  it.each(cases)('$page: $label does not track clipboard failure', async ({ page, label }) => {
    writeText.mockRejectedValueOnce(new Error('Clipboard access denied'));
    await render(page);
    await click(label);

    expect(writeText).toHaveBeenCalledOnce();
    expect(send).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledOnce();
  });

  it.each(cases)(
    '$page: $label waits for the clipboard promise',
    async ({ page, label, event, payload }) => {
      let finishCopy!: () => void;
      writeText.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          finishCopy = resolve;
        })
      );
      await render(page);
      await click(label);

      expect(writeText).toHaveBeenCalledOnce();
      expect(send).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();

      await act(async () => finishCopy());
      expect(send).toHaveBeenCalledExactlyOnceWith(event, payload);
      expect(toast.success).toHaveBeenCalledOnce();
    }
  );

  it.each([
    { label: '复制 RSS 订阅链接', props: { feedURL: '', resources } },
    { label: '复制所有磁力链接', props: { feedURL, resources: [] } },
    { label: '复制为 cURL 命令', props: { filter: undefined } },
    { label: '复制为 JavaScript 代码', props: { filter: undefined } },
    { label: '复制为 Python 代码', props: { filter: undefined } },
    { label: '复制为网页嵌入代码', props: { filter: undefined } }
  ])('$label does not track validation failure', async ({ label, props }) => {
    await render('resources', props);
    await click(label);

    expect(writeText).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledOnce();
  });
});
