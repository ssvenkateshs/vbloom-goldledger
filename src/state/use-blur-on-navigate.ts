import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Web only: when the route changes, drop keyboard focus from the element that
 * triggered the navigation. The navigator marks the previous screen
 * `aria-hidden`, and browsers warn (and screen readers get confused) if a
 * focused element sits inside a hidden subtree.
 */
export function useBlurOnNavigate() {
  const pathname = usePathname();
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const active = globalThis.document?.activeElement;
    if (active instanceof HTMLElement && active !== document.body) active.blur();
  }, [pathname]);
}
