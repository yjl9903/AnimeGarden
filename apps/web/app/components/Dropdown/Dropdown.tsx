import clsx, { type ClassValue } from 'clsx';
import { memo } from 'react';

export interface DropdownProps {
  className?: ClassValue;

  trigger: React.ReactNode;

  children: React.ReactNode;
}

export const Dropdown = memo((props: DropdownProps) => {
  return (
    <div className={clsx('relative', '[&:hover>.c-dropdown]:block', props.className)}>
      {props.trigger}
      {props.children}
    </div>
  );
});

export const DropdownMenu = memo(
  (props: { className?: ClassValue; children?: React.ReactNode }) => {
    return (
      <div className={clsx('c-dropdown hidden absolute top-full', 'border', props.className)}>
        {props.children}
      </div>
    );
  }
);

export const DropdownMenuItem = memo(
  (props: { className?: ClassValue; children?: React.ReactNode }) => {
    return <div></div>;
  }
);

export const DropdownSubMenuItem = memo((props: DropdownProps) => {
  return (
    <div className={clsx('relative', '', '[&:hover>.c-dropdown]:block', props.className)}>
      {props.trigger}
      {props.children}
    </div>
  );
});

export const DropdownSubMenu = memo(
  (props: { className?: ClassValue; children?: React.ReactNode }) => {
    return (
      <div
        className={clsx(
          'c-dropdown hidden absolute top-0 left-full overflow-y-auto',
          props.className
        )}
      >
        {props.children}
      </div>
    );
  }
);
