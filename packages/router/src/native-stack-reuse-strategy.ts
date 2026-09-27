/**
 * The reuse strategy that turns navigation into a stack.
 *
 * Angular's default strategy never detaches, so navigating away destroys the component and its
 * native views, and coming back rebuilds them from scratch: a list is back at the top, a form is
 * empty. Detaching instead hands the live `ComponentRef` to the outlet, which keeps its screen
 * mounted. That is the whole reason `RouterOutletContract.detach()` exists.
 *
 * No decorators, so tests can import it and so it can be provided with `useClass`.
 */
import type { ComponentRef } from '@angular/core';
import {
  BaseRouteReuseStrategy,
  type ActivatedRouteSnapshot,
  type DetachedRouteHandle,
  type Route,
} from '@angular/router';
import { isScreenRoute, isTabRoute } from './tab-routes.ts';

/**
 * Where `reuseScreen` marks a route. On the config's `data` rather than in a set of configs,
 * because the router copies every route config it is given, so the object an app wrote is never
 * the one a snapshot points at.
 */
const REUSE_SCREEN = 'ɵreuseScreen';

/**
 * Keep one screen for a route whatever its parameters, updating it in place as Angular's own
 * strategy does, instead of pushing a new screen for each url.
 *
 * `reuseScreen({ path: 'photo/:index', component: Photo })` for a route whose parameter picks
 * what one screen shows - a pager, a step through a list - rather than naming another screen to
 * go to. Everything else stacks: `/user/1` then `/user/2` is two screens, and back returns to the
 * first.
 */
export function reuseScreen<T extends Route>(route: T): T {
  return { ...route, data: { ...route.data, [REUSE_SCREEN]: true } };
}

/** What the router actually stores: `DetachedRouteHandle` is typed as an opaque object. */
interface StoredHandle {
  readonly componentRef?: ComponentRef<unknown>;
}

/**
 * Identify a screen by its resolved url rather than its route config, so `/user/1` and `/user/2`
 * are two screens on the stack rather than one that gets reused.
 *
 * One entry per level of the route tree, empty ones included. Flattened to a url, a tab at
 * `/tabs/library` and the list at path `''` beneath it are the same string, and the router, asking
 * for the list, is handed the tab's whole tree and makes the tab its own child.
 */
function keyOf(route: ActivatedRouteSnapshot): string {
  const levels: string[] = [];
  for (let current: ActivatedRouteSnapshot | null = route; current; current = current.parent) {
    levels.unshift(current.url.map((segment) => segment.toString()).join('/'));
  }
  return JSON.stringify(levels);
}

export class NativeStackReuseStrategy extends BaseRouteReuseStrategy {
  private readonly handles = new Map<string, DetachedRouteHandle>();

  /**
   * Only leaf routes become screens; a parent with children is layout, not a destination.
   *
   * A tab is the exception, and has to be. Detaching only its leaf would rebuild the tab itself
   * on every switch, and with it the stack outlet inside: a tab two screens deep would come back
   * one screen deep, having lost the screens the user could go back to. Detaching the tab keeps
   * its whole subtree, which is what makes each tab remember where it was.
   *
   * So is a parent a native stack put on screen, such as a root stack's tab bar: a sheet presented
   * over it has to leave it standing (see `markScreenRoute`).
   */
  override shouldDetach(route: ActivatedRouteSnapshot): boolean {
    if (route.component === null) return false;
    return (
      route.children.length === 0 ||
      isTabRoute(route.routeConfig) ||
      isScreenRoute(route.routeConfig)
    );
  }

  override store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    const key = keyOf(route);
    // A null handle is the router telling us the screen is gone for good.
    if (handle) {
      this.handles.set(key, handle);
      this.forgetOnDestroy((handle as StoredHandle).componentRef);
    } else this.handles.delete(key);
  }

  /** Refs whose destruction already drops their handles. */
  private readonly watched = new WeakSet<ComponentRef<unknown>>();

  /**
   * Drop a screen's handles the moment its component is destroyed.
   *
   * The router stores a handle for every screen it navigates away from, the one being popped
   * included, and the outlet then destroys that screen. A handle outlives its component, and holds
   * the component's whole view and every native node in it; `retrieve` notices only when the same
   * url is asked for again, so a url never revisited kept its last screen for as long as the app
   * ran.
   */
  private forgetOnDestroy(ref: ComponentRef<unknown> | undefined): void {
    if (!ref || this.watched.has(ref)) return;
    this.watched.add(ref);
    ref.onDestroy(() => {
      for (const [key, handle] of this.handles) {
        if ((handle as StoredHandle).componentRef === ref) this.handles.delete(key);
      }
    });
  }

  /**
   * Angular reuses a route whenever its config is the same, so on the web `/user/1` to `/user/2`
   * keeps the one component and feeds it the new params. On a native stack that turns a push into
   * an update in place: no push animation, one screen, and back skipping past `/user/1`. A screen
   * a stack put on screen is reused only when its url is the same too, so a different parameter
   * is a different screen, which the router detaches and stores as it does any screen pushed
   * away. A query or fragment change is not part of the url that identifies a screen, and a
   * parent that is only layout is reused as before, so its stack keeps what is in it.
   */
  override shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    if (future.routeConfig !== curr.routeConfig) return false;
    const config = curr.routeConfig;
    if (!isScreenRoute(config) || config?.data?.[REUSE_SCREEN] === true) return true;
    return keyOf(future) === keyOf(curr);
  }

  override shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return this.retrieve(route) !== null;
  }

  /**
   * The router only ever tells the strategy about a screen it detached, never about one the
   * outlet destroyed on a pop, so a handle can outlive its component. Pushing A, then B, going
   * back and pushing B again would otherwise attach B's destroyed ref: a screen that renders and
   * never updates. The ref knows it is dead, so ask it rather than couple the two.
   */
  override retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    const key = keyOf(route);
    const handle = this.handles.get(key) as StoredHandle | undefined;
    if (!handle) return null;
    if (handle.componentRef?.hostView.destroyed) {
      this.handles.delete(key);
      return null;
    }
    return handle;
  }
}
