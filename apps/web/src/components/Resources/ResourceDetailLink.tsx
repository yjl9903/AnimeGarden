import { Link } from '@tanstack/react-router';
import type { ComponentProps } from 'react';

import { RESOURCE_DETAIL_PAGES_ENABLED } from '~/utils/constants';

type Props = Pick<ComponentProps<'a'>, 'children' | 'onClick' | 'className' | 'aria-label'> & {
  resource: { provider: string; providerId: string };
  hideWhenUnavailable?: boolean;
};

/** 暂时下架时保留文字，隐藏独立的详情按钮。恢复由 Web 常量控制。 */
export function ResourceDetailLink({ resource, hideWhenUnavailable, children, ...props }: Props) {
  if (!RESOURCE_DETAIL_PAGES_ENABLED) return hideWhenUnavailable ? null : children;

  return (
    <Link
      to="/detail/$provider/$providerId"
      params={{ provider: resource.provider, providerId: resource.providerId }}
      {...props}
    >
      {children}
    </Link>
  );
}
