import type { TranslateFunction } from '../i18n.js';

import { getReact } from '../react.js';

/** Panel title linking to the public Anime Garden site. */
export function PanelHeader({ t }: { t: TranslateFunction }) {
  const React = getReact();
  return (
    <header className="agp-head">
      <h1 className="agp-title">
        <a
          className="agp-title-link"
          href="https://animes.garden"
          target="_blank"
          rel="noreferrer noopener"
        >
          <span className="agp-title-emoji" aria-hidden="true">
            🌸
          </span>
          {t('title')}
        </a>
      </h1>
    </header>
  );
}
