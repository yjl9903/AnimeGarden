import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

import umamiHandler from '../src/layouts/umami.ts?inline-ts';

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
