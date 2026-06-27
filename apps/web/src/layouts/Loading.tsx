import { useHydrated, useRouterState } from '@tanstack/react-router';

export function Loading() {
  const hydrated = useHydrated();
  const status = useRouterState({ select: (state) => state.status });

  return (
    hydrated &&
    status === 'pending' && (
      <div id="animegarden-progress">
        <div></div>
        <div></div>
      </div>
    )
  );
}
