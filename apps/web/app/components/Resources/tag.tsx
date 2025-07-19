import { memo } from 'react';

export const Tag = memo((props: { text: string; color?: string; className?: string }) => {
  const { text, className = '', color = 'bg-gray-200' } = props;

  return (
    <span
      className={`
  inline-flex items-center gap1
  rounded-md px2 py1 font-mono
  transition transition-colors
  text-base-800 ${color} ${className}`}
    >
      {text}
    </span>
  );
});
