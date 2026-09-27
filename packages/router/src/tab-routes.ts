/**
 * Which route configs are tabs.
 *
 * The reuse strategy has to know, because a tab is detached whole rather than by its leaf, and it
 * has nothing but an `ActivatedRouteSnapshot` to go on. Tabs are declared in a template now, so
 * there is nothing on the route config to read: the outlet marks the config it matched each
 * `<native-tab>` to, and the strategy asks here.
 *
 * A `WeakSet` rather than a flag written onto the config, so nothing an app can read changes, and
 * so a lazily loaded config that goes away takes its entry with it.
 */
import type { Route } from '@angular/router';

const TAB_ROUTES = new WeakSet<Route>();

export function markTabRoute(route: Route): void {
  TAB_ROUTES.add(route);
}

export function isTabRoute(route: Route | null | undefined): boolean {
  return route != null && TAB_ROUTES.has(route);
}

/**
 * Route configs a native stack has put on screen.
 *
 * A stack's screen is usually a leaf, but not always: an app's root stack whose first screen is
 * the tab bar shows a route with children. When something is presented over it - a sheet opened
 * from inside a tab - that route has to be kept like any other screen below, or the router
 * destroys the whole tab bar and the sheet has nothing to sit on. The stack outlet marks what it
 * activates, so the strategy can tell a screen with children from a parent that is only layout.
 */
const SCREEN_ROUTES = new WeakSet<Route>();

export function markScreenRoute(route: Route): void {
  SCREEN_ROUTES.add(route);
}

export function isScreenRoute(route: Route | null | undefined): boolean {
  return route != null && SCREEN_ROUTES.has(route);
}
