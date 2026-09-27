/**
 * Route params as component inputs, which is what `withComponentInputBinding()` promises.
 *
 * Angular's own binder is a service behind `INPUT_BINDER`, a token the router does not export, and
 * `RouterOutlet` is the only thing that calls it. An outlet that is not `RouterOutlet` therefore
 * has to do this itself - and both of ours advertise `supportsBindingToComponentInputs`, so until
 * now they were promising something nobody delivered: a `:album` param reached the component as
 * an empty input, with no error anywhere.
 *
 * Like Angular's, it only runs in an app that asked for it: both outlets check
 * `Router.componentInputBindingEnabled` first, which is true exactly when `RouterOutlet` would
 * find a binder behind that token. Without the feature a routed page's inputs are its own.
 *
 * The behaviour matches `RoutedComponentInputBinder`: query params first, then path params, then
 * resolved data, and every declared input is written on every change - including to `undefined`
 * when the key is gone, which is what stops a stale param from surviving a navigation.
 */
import { reflectComponentType, type ComponentRef } from '@angular/core';
import type { ActivatedRoute } from '@angular/router';

type Values = Record<string, unknown>;

export function bindRouteInputs(ref: ComponentRef<unknown>, route: ActivatedRoute): () => void {
  const mirror = reflectComponentType(ref.componentType);
  if (!mirror || mirror.inputs.length === 0) return () => {};

  let queryParams: Values = {};
  let params: Values = {};
  let data: Values = {};

  const apply = () => {
    if (ref.hostView.destroyed) return;
    const merged = { ...queryParams, ...params, ...data };
    for (const { templateName } of mirror.inputs) {
      ref.setInput(templateName, merged[templateName]);
    }
  };

  // Three subscriptions rather than a `combineLatest`, so this file needs no rxjs operators. Each
  // emits synchronously on subscribe, so the inputs are set before the first change detection.
  const subscriptions = [
    route.queryParams.subscribe((value) => {
      queryParams = value;
      apply();
    }),
    route.params.subscribe((value) => {
      params = value;
      apply();
    }),
    route.data.subscribe((value) => {
      data = value;
      apply();
    }),
  ];

  return () => subscriptions.forEach((subscription) => subscription.unsubscribe());
}
