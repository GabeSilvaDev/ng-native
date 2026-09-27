import { computed, inject, Service } from '@angular/core';
import { ColorScheme, type Scheme } from '@ng-native/device';

/**
 * The canary's palette, for the colours TypeScript binds: the native bars, and the props that
 * take a colour rather than a style, such as `placeholderTextColor`.
 *
 * The same values as the custom properties in global-styles.ts, written out again because a prop
 * cannot read the cascade. Change one, change both.
 */
export const palette = {
  light: {
    screen: '#f4f4f7',
    card: '#ffffff',
    textStrong: '#101014',
    text: '#3a3a44',
    textMuted: '#6c6c78',
    success: '#1c8038',
    accent: '#3b6ef5',
  },
  dark: {
    screen: '#101014',
    card: '#2a2a33',
    textStrong: '#ffffff',
    text: '#c8c8d0',
    textMuted: '#6c6c78',
    success: '#7fd18a',
    accent: '#3b6ef5',
  },
} satisfies Record<Scheme, Record<string, string>>;

/** The palette for the scheme the system is in, as a signal. */
@Service()
export class Palette {
  private readonly scheme = inject(ColorScheme);

  readonly current = computed(() => palette[this.scheme.current()]);
}
