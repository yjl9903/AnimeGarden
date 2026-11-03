import type * as ReactNamespace from 'react';

import { createPlugin } from './client/index.js';

declare global {
  interface Window {
    /** Harness Client module loader; the web shell installs it before plugin scripts run. */
    __ModuleLoader__: {
      load(plugin: { id: string; factory(require: (id: string) => unknown): unknown }): void;
    };
  }
}

// The loader materializes one lazy factory per artifact; the id is the npm package name.
window.__ModuleLoader__.load({
  id: 'dsh-plugin-animegarden',
  factory(require) {
    const React = require('react') as typeof ReactNamespace;
    return createPlugin(React);
  }
});
