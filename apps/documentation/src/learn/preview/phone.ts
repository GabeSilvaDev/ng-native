/**
 * The screen: the learner's app mounted with `@ng-native/web`, replaced on every good run and
 * kept on every bad one, so an error is shown over the last thing that worked.
 *
 * The platform is fixed for the life of the frame, because `registerPlatformComponents` changes a
 * table in `@ng-native/fabric` that cannot be put back; the lesson page reloads the frame to
 * switch. The colour scheme is not: the toggle drives `ColorScheme` directly, in place of
 * `prefers-color-scheme`.
 */
import { ErrorHandler, type Type } from '@angular/core';
import { ColorScheme } from '@ng-native/device';
import { mount, type MountResult } from '@ng-native/web';
import type { Platform, Scheme } from '../protocol.ts';

/** Where the status bar and home indicator are, as `<safe-area-provider>` would report them. */
const INSETS: Record<Platform, { top: number; bottom: number }> = {
  ios: { top: 54, bottom: 34 },
  android: { top: 28, bottom: 16 },
};

const COMPONENT_STYLES = 'style[data-ng-native-component]';

export class Phone {
  private mounted: { result: MountResult; root: HTMLElement; styles: Element[] } | undefined;
  private scheme: Scheme = 'light';
  private readonly listeners = new Set<(scheme: Scheme) => void>();
  private readonly platform: Platform;
  private readonly screen: HTMLElement;
  private readonly onError: (error: unknown) => void;

  constructor(screen: HTMLElement, platform: Platform, onError: (error: unknown) => void) {
    this.screen = screen;
    this.platform = platform;
    this.onError = onError;
    const root = document.documentElement;
    root.classList.add(`platform-${platform}`);
    root.style.setProperty('--safe-area-inset-top', `${INSETS[platform].top}px`);
    root.style.setProperty('--safe-area-inset-bottom', `${INSETS[platform].bottom}px`);
  }

  get root(): HTMLElement | undefined {
    return this.mounted?.root;
  }

  /**
   * What `ColorScheme` reports. Only that: Tailwind's `dark:` matches a `dark` class the app puts
   * on its own root, as it does on a device, so an app that ignores the scheme stays light here too.
   */
  setScheme(scheme: Scheme): void {
    this.scheme = scheme;
    for (const listener of this.listeners) listener(scheme);
  }

  /**
   * Mount `component` beside the current app, and swap it in only if it mounted without an
   * error. Resolves with the errors the first render raised; with any, the old app stays.
   */
  replace(component: Type<unknown>): unknown[] {
    // The new app is mounted over the old one, both absolutely positioned, so each lays out at
    // the full size of the screen and nothing is painted until the swap is done.
    const errors: unknown[] = [];
    const before = new Set(document.querySelectorAll(COMPONENT_STYLES));
    const root = document.createElement('div');
    root.className = 'app-root';
    this.screen.appendChild(root);
    let result: MountResult | undefined;
    try {
      result = mount(root, component, {
        injectReset: false,
        providers: this.providers((error) => (result ? this.onError(error) : errors.push(error))),
      });
    } catch (error) {
      errors.push(error);
    }
    const styles = [...document.querySelectorAll(COMPONENT_STYLES)].filter(
      (style) => !before.has(style),
    );
    if (errors.length || !result) {
      result?.destroy();
      root.remove();
      for (const style of styles) style.remove();
      return errors;
    }
    // `mount` marks its root `platform-web`, for the `web:` variant. This is a phone.
    root.classList.remove('platform-web');
    this.unmount();
    this.mounted = { result, root, styles };
    return [];
  }

  unmount(): void {
    if (!this.mounted) return;
    this.mounted.result.destroy();
    this.mounted.root.remove();
    for (const style of this.mounted.styles) style.remove();
    this.mounted = undefined;
  }

  private providers(report: (error: unknown) => void) {
    const scheme = {
      current: () => this.scheme,
      subscribe: (listener: (scheme: Scheme) => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
      },
    };
    return [
      { provide: ColorScheme.SOURCE, useValue: scheme },
      { provide: ErrorHandler, useValue: { handleError: report } },
    ];
  }
}
