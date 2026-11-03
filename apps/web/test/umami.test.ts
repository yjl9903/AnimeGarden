import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';

import umamiHandler from '../src/layouts/umami.ts?inline-ts';
import { getTrackAttributes, track, type TrackPayload } from '../src/utils/umami';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Skills copy tracking', () => {
  it.each<TrackPayload<'skills.copy'>>([
    { kind: 'prompt', source: 'hero' },
    { kind: 'prompt', source: 'online' },
    { kind: 'command', source: 'local' },
    { kind: 'command', source: 'mcp.codex' },
    { kind: 'command', source: 'plugin.claude' },
    { kind: 'prompt', source: 'plugin.dsh' },
    { kind: 'example', source: 'example', example: '找一部动画' }
  ])('sends only copy metadata for $source', (payload) => {
    const send = vi.fn();
    vi.stubGlobal('window', { umami: { track: send } });

    const withPrivateContent = { ...payload, text: 'private clipboard content' };
    track('skills.copy', withPrivateContent);

    expect(send).toHaveBeenCalledExactlyOnceWith('skills.copy', payload);
  });

  it('works when the analytics script is unavailable', () => {
    vi.stubGlobal('window', {});
    expect(() => track('skills.copy', { kind: 'prompt', source: 'hero' })).not.toThrow();
  });
});

describe('generic tracking', () => {
  it('sends explicit names and payloads without rewriting them', () => {
    const send = vi.fn();
    vi.stubGlobal('window', { umami: { track: send } });

    track('collection.add');
    track('nav.click.anime');
    track('nav.click.anime', { item: '动画', group: '周一' });
    track('resources.detail.click', { resource: 'dmhy:123', type: '动画' });
    track('copy.fetch', { language: 'python' });

    expect(send.mock.calls).toEqual([
      ['collection.add', undefined],
      ['nav.click.anime', undefined],
      ['nav.click.anime', { item: '动画', group: '周一' }],
      ['resources.detail.click', { resource: 'dmhy:123', type: '动画' }],
      ['copy.fetch', { language: 'python' }]
    ]);
  });

  it('omits absent optional fields but preserves required empty strings', () => {
    const send = vi.fn();
    vi.stubGlobal('window', { umami: { track: send } });
    track('skills.chat.open', { app: 'Claude', source: 'direct', example: undefined });
    track('search.history.delete', { action: 'clear', text: '', count: '0' });
    track('collection.share', { hash: '' });

    expect(send.mock.calls).toEqual([
      ['skills.chat.open', { app: 'Claude', source: 'direct' }],
      ['search.history.delete', { action: 'clear', count: '0' }],
      ['collection.share', { hash: '' }]
    ]);
  });

  it('is safe during SSR without logging a missing-window error', () => {
    vi.stubGlobal('window', undefined);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => track('copy.feed')).not.toThrow();
    expect(log).not.toHaveBeenCalled();
  });

  it('does not interrupt user actions when the tracker throws', () => {
    const error = new Error('tracker blocked');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('window', {
      umami: {
        track: () => {
          throw error;
        }
      }
    });
    expect(() => track('copy.feed')).not.toThrow();
    expect(log).toHaveBeenCalledWith(error);
  });
});

describe('declarative tracking attributes', () => {
  it('builds the existing PikPak attributes without sending an event or adding handlers', () => {
    const send = vi.fn();
    vi.stubGlobal('window', { umami: { track: send } });
    expect(getTrackAttributes('pikpak', { resource: 'dmhy:123', source: 'play' })).toEqual({
      'data-umami-event': 'pikpak',
      'data-umami-event-resource': 'dmhy:123',
      'data-umami-event-source': 'play'
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('supports payload-free events and optional payloads during SSR', () => {
    vi.stubGlobal('window', undefined);
    expect(getTrackAttributes('collection.add')).toEqual({
      'data-umami-event': 'collection.add'
    });
    expect(getTrackAttributes('nav.click.anime')).toEqual({
      'data-umami-event': 'nav.click.anime'
    });
    expect(getTrackAttributes('feed.open', { href: '/feed.xml' })).toEqual({
      'data-umami-event': 'feed.open',
      'data-umami-event-href': '/feed.xml'
    });
  });

  it('uses the same field allowlist and optional-value handling as track', () => {
    const payload: TrackPayload<'skills.copy'> & { text: string } = {
      kind: 'prompt',
      source: 'hero',
      example: '',
      text: 'private clipboard content'
    };
    expect(getTrackAttributes('skills.copy', payload)).toEqual({
      'data-umami-event': 'skills.copy',
      'data-umami-event-kind': 'prompt',
      'data-umami-event-source': 'hero'
    });
  });
});

/** Browser overrides used to exercise framework artifacts and unsupported APIs. */
interface BrowserOverrides {
  navigator?: Record<string, unknown>;
  window?: Record<string, unknown>;
  document?: Record<string, unknown>;
}

/** Execute the actual inline script before any tracker is present. */
function loadHook(
  webdriver: boolean | undefined = false,
  userAgent = 'Mozilla/5.0 Chrome/140',
  overrides: BrowserOverrides = {}
) {
  const browser = { webdriver, userAgent, ...overrides.navigator };
  const window = { ...overrides.window } as Record<string, unknown> & {
    beforeUmamiSend: (type: string, payload: Record<string, unknown>) => Record<string, unknown>;
  };
  runInNewContext(umamiHandler, { window, navigator: browser, document: overrides.document ?? {} });
  return { hook: window.beforeUmamiSend, browser, window };
}

describe('Umami automation signals', () => {
  it.each([
    [true, 'Chrome/140', 'suspected_automation'],
    [false, 'HeadlessChrome/140', 'suspected_automation'],
    [true, 'headlesschrome/140', 'suspected_automation']
  ] as const)(
    'classifies pageviews with webdriver=%s and UA=%s',
    (webdriver, userAgent, expected) => {
      const { hook } = loadHook(webdriver, userAgent);
      const pageview = { website: 'website-id', url: '/anime', title: 'Anime' };

      expect(hook('event', pageview)).toEqual({
        ...pageview,
        data: {
          traffic_class: expected
        }
      });
      expect(pageview).not.toHaveProperty('data');
    }
  );

  it.each<BrowserOverrides>([
    { navigator: { userAgentData: { brands: [{ brand: 'HeadlessChrome' }] } } },
    { navigator: { userAgentData: { brands: [{ brand: 'headlesschrome' }] } } },
    { window: { __playwright__binding__: () => {} } },
    { window: { __pwInitScripts: {} } },
    { document: { __webdriver_script_fn: () => {} } },
    { document: { __selenium_evaluate: () => {} } },
    { window: { cdc_adoQpoasnfa76pfcZLmcfl_Array: [] } },
    { window: { cdc_adoQpoasnfa76pfcZLmcfl_Promise: Promise } },
    { window: { cdc_adoQpoasnfa76pfcZLmcfl_Symbol: Symbol } }
  ])('tags additional automation artifacts with only one property: %j', (overrides) => {
    const { hook } = loadHook(false, 'Chrome/140', overrides);
    expect(hook('event', { url: '/anime' })).toEqual({
      url: '/anime',
      data: { traffic_class: 'suspected_automation' }
    });
  });

  it.each<BrowserOverrides>([
    { navigator: { userAgentData: { brands: [{ brand: 'Chromium' }, { brand: 'Not A Brand' }] } } },
    { navigator: { userAgentData: { brands: [] }, plugins: [], languages: [] } },
    { navigator: { userAgentData: { brands: null } } },
    { window: { webdriver: true, emit: () => {}, cdc_business_Array: [], cdc_foo_custom: true } }
  ])('does not classify missing features or unrelated globals as automation: %j', (overrides) => {
    const { hook } = loadHook(false, 'Chrome/140', overrides);
    const payload = { name: 'download', data: { resource: 'dmhy:123' } };
    expect(hook('event', payload)).toBe(payload);
  });

  it('detects non-enumerable driver markers injected after the first pageview', () => {
    const { hook, window } = loadHook();
    expect(hook('event', {})).not.toHaveProperty('data');
    Object.defineProperty(window, 'cdc_adoQpoasnfa76pfcZLmcfl_Array', { value: [] });
    expect(hook('event', {}).data).toEqual({ traffic_class: 'suspected_automation' });
  });

  it('still sends the original payload if a browser signal cannot be read', () => {
    const { hook, browser } = loadHook();
    Object.defineProperty(browser, 'webdriver', {
      get() {
        throw new Error('Browser property blocked');
      }
    });
    const payload = { name: 'download', data: { resource: 'dmhy:123' } };
    expect(hook('event', payload)).toBe(payload);
  });

  it.each([false, undefined])(
    'leaves unclassified traffic unchanged with webdriver=%s',
    (webdriver) => {
      const { hook } = loadHook(webdriver);
      const pageview = { website: 'website-id', url: '/anime' };
      const event = { ...pageview, name: 'download', data: { resource: 'dmhy:123' } };

      expect(hook('event', pageview)).toBe(pageview);
      expect(hook('event', event)).toBe(event);
      expect(pageview).not.toHaveProperty('data');
      expect(event.data).toEqual({ resource: 'dmhy:123' });
    }
  );

  it('preserves custom event metadata and business properties without mutating them', () => {
    const { hook } = loadHook(true);
    const payload = Object.freeze({
      website: 'website-id',
      url: '/resources',
      name: 'download',
      data: Object.freeze({ resource: 'dmhy:123', source: 'table' })
    });

    expect(hook('event', payload)).toMatchObject({
      ...payload,
      data: { ...payload.data, traffic_class: 'suspected_automation' }
    });
    expect(payload.data).not.toHaveProperty('traffic_class');
  });

  it.each(['identify', 'performance'])('leaves %s requests untouched', (type) => {
    const { hook } = loadHook(true);
    const payload = { data: { existing: true } };
    expect(hook(type, payload)).toBe(payload);
  });

  it('reads current signals on every event instead of caching a session classification', () => {
    const { hook, browser } = loadHook();
    expect(hook('event', {})).not.toHaveProperty('data');
    browser.webdriver = true;
    expect(hook('event', {}).data).toMatchObject({ traffic_class: 'suspected_automation' });
  });
});
