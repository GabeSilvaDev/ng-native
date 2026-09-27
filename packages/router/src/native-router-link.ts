/**
 * `routerLink` for native.
 *
 * Angular's `RouterLink` host-binds `href` and listens for a DOM click, neither of which exists
 * here. This binds to a `<pressable>`'s `press` output instead.
 *
 * Because Angular resolves outputs across every directive on an element, the host listener below
 * binds to `Pressable`'s `press` output without importing it, so the router package does not
 * depend on the components package.
 */
import { Directive, inject, input } from '@angular/core';
import { ActivatedRoute, Router, type NavigationExtras } from '@angular/router';
import { NATIVE_INTENT } from './native-navigation.ts';

@Directive({
  selector: '[nativeRouterLink]',
  host: { '(press)': 'navigate()' },
})
export class NativeRouterLink {
  /** A url string, or the command array `Router.navigate` takes. */
  readonly nativeRouterLink = input.required<string | readonly unknown[]>();
  readonly extras = input<NavigationExtras>();

  /** Replace the current screen rather than pushing a new one. */
  readonly replace = input(false);

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute, { optional: true });

  protected navigate(): void {
    const target = this.nativeRouterLink();
    const own = this.extras();
    const extras: NavigationExtras = {
      relativeTo: this.route,
      replaceUrl: this.replace(),
      ...own,
    };
    // `replaceUrl` only swaps the history entry. The stack reads the intent to swap the screen,
    // as `NativeNavigation.replace` sets it; without it the replaced screen stays mounted
    // underneath, and a swipe back lands on a page the history no longer has.
    if (this.replace()) {
      extras.state = { ...own?.state, [NATIVE_INTENT]: { stack: 'replace' } };
    }

    void this.router.navigate(Array.isArray(target) ? [...target] : [target], extras);
  }
}
