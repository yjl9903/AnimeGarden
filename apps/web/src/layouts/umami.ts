/** Umami payload fields retained while adding event-level automation signals. */
interface UmamiTrackingPayload {
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Optional Client Hints are unavailable in some browsers and expose only brand names here. */
interface UmamiNavigator extends Navigator {
  userAgentData?: { brands?: { brand: string }[] };
}

Object.assign(window, {
  /** Tag suspected automation without adding data to unclassified traffic or extra requests. */
  beforeUmamiSend(type: string, payload: UmamiTrackingPayload): UmamiTrackingPayload {
    // Identify and performance payloads have separate semantics and stay untouched.
    if (type !== 'event') return payload;

    let automated = false;
    try {
      const brands = (navigator as UmamiNavigator).userAgentData?.brands;
      // Use specific automation artifacts; missing browser features are not evidence of a bot.
      automated =
        navigator.webdriver === true ||
        /HeadlessChrome/i.test(navigator.userAgent) ||
        (Array.isArray(brands) && brands.some(({ brand }) => /^HeadlessChrome$/i.test(brand))) ||
        Object.hasOwn(window, '__playwright__binding__') ||
        Object.hasOwn(window, '__pwInitScripts') ||
        Object.hasOwn(document, '__webdriver_script_fn') ||
        Object.hasOwn(document, '__selenium_evaluate') ||
        Object.getOwnPropertyNames(window).some((name) =>
          /^cdc_[A-Za-z0-9]{22}_(?:Array|Promise|Symbol)$/.test(name)
        );
    } catch {
      // Browser overrides must not prevent existing analytics from being sent.
      return payload;
    }

    // Missing automation signals do not prove that the visitor is human; leave it unlabelled.
    if (!automated) return payload;

    return {
      ...payload,
      data: {
        ...payload.data,
        traffic_class: 'suspected_automation'
      }
    };
  }
});
