import type { TranslateFunction } from '../i18n.js';

import { getReact } from '../react.js';

import { CheckIcon, ChevronIcon } from './icons.js';

/** One selectable value in a toolbar filter dropdown. */
export interface FilterOption {
  key: string;
  label: string;
}

/** Props for one multi-select filter dropdown. */
export interface FilterDropdownProps {
  t: TranslateFunction;
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}

/** One multi-select dropdown used by the fan-sub and type filters. */
export function FilterDropdown(props: FilterDropdownProps) {
  const React = getReact();
  const { t, options, selected } = props;
  const [open, setOpen] = React.useState(false);
  const root = React.useRef<HTMLDivElement | null>(null);
  const panel = React.useRef<HTMLDivElement | null>(null);
  const [alignEnd, setAlignEnd] = React.useState(false);

  // Close on an outside pointer press or Escape, and clean both listeners up.
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent): void => {
      if (
        root.current !== null &&
        event.target instanceof Node &&
        !root.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Left-aligned by default; flip to the right edge only when the panel would
  // overflow the viewport. Measure before paint so the panel never jumps sideways.
  React.useLayoutEffect(() => {
    if (!open || panel.current === null) return;
    const rect = panel.current.getBoundingClientRect();
    setAlignEnd(rect.right > window.innerWidth - 8);
  }, [open, options.length]);

  const selectedSet = React.useMemo(() => new Set(selected), [selected]);
  const selectedLabels = options
    .filter((option) => selectedSet.has(option.key))
    .map((option) => option.label);
  const summary =
    selectedLabels.length === 0 ? props.label : `${props.label} ${selectedLabels.join('、')}`;
  const toggle = (key: string): void => {
    props.onChange(
      selectedSet.has(key) ? selected.filter((entry) => entry !== key) : [...selected, key]
    );
  };

  return (
    <div className="agp-dropdown" ref={root}>
      <button
        type="button"
        className="agp-toolbar-button"
        aria-haspopup="true"
        aria-expanded={open}
        title={summary}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="agp-toolbar-label">{summary}</span>
        <ChevronIcon />
      </button>
      {open ? (
        <div
          className={`agp-dropdown-panel${alignEnd ? ' agp-dropdown-panel-end' : ''}`}
          ref={panel}
          role="group"
          aria-label={props.label}
        >
          <div className="agp-dropdown-scroll">
            <div className="agp-dropdown-list" role="listbox" aria-multiselectable="true">
              {options.map((option) => {
                const checked = selectedSet.has(option.key);
                return (
                  <button
                    key={option.key}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    className="agp-dropdown-option"
                    onClick={() => toggle(option.key)}
                  >
                    <span className="agp-dropdown-label">{option.label}</span>
                    {checked ? (
                      <span className="agp-dropdown-check" aria-hidden="true">
                        <CheckIcon />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {selected.length > 0 ? (
              <div className="agp-dropdown-foot">
                <button
                  type="button"
                  className="agp-dropdown-clear"
                  onClick={() => props.onChange([])}
                >
                  {t('clear')}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
