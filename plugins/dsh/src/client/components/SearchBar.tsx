import type { ChangeEvent, CompositionEvent, FormEvent } from 'react';

import type { TranslateFunction } from '../i18n.js';

import { getReact } from '../react.js';

/** Props for the controlled search input. */
export interface SearchBarProps {
  t: TranslateFunction;
  value: string;
  onInput: (value: string) => void;
  onComposingChange: (composing: boolean) => void;
  /** Called before a user edit so the debounce can attribute the search. */
  onTyping: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/** Search form: controlled input with IME composition hand-off. */
export function SearchBar(props: SearchBarProps) {
  const React = getReact();
  const { t } = props;
  return (
    <form className="agp-searchbar" role="search" onSubmit={props.onSubmit}>
      <input
        className="agp-input"
        type="search"
        value={props.value}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchLabel')}
        autoComplete="off"
        spellCheck={false}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          props.onTyping();
          props.onInput(event.target.value);
        }}
        onCompositionStart={() => props.onComposingChange(true)}
        onCompositionEnd={(event: CompositionEvent<HTMLInputElement>) => {
          props.onComposingChange(false);
          props.onInput(event.currentTarget.value);
        }}
      />
    </form>
  );
}
