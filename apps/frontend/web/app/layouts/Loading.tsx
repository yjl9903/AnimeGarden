import { useNavigation } from '@remix-run/react';

export function Loading() {
  const navigation = useNavigation();

  return (
    navigation.state === 'loading' && (
      <div id="animegarden-progress">
        <div></div>
        <div></div>
      </div>
    )
  );
}
