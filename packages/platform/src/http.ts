/**
 * `HttpClient`, configured for React Native.
 *
 * ```ts
 * mount(rootTag, App, getFabricUIManager(), {
 *   providers: [provideNativeHttpClient(withInterceptors([auth]))],
 * });
 * ```
 *
 * Use this instead of `provideHttpClient()`, which on a device fails silently. Angular's default
 * backend is `fetch`, and it reads a response body only through `response.body`'s stream. React
 * Native's `fetch` is `whatwg-fetch` over XHR, whose `Response` has no `body`, so every request
 * resolves with `null` and nothing reports why. RN's `XMLHttpRequest` is native and complete,
 * upload progress included, so the XHR backend is the one to use.
 *
 * A separate entry point so an app that never makes a request does not need `@angular/common`.
 */
import type { EnvironmentProviders } from '@angular/core';
import {
  provideHttpClient,
  withXhr,
  type HttpFeature,
  type HttpFeatureKind,
} from '@angular/common/http';

export function provideNativeHttpClient(
  ...features: HttpFeature<HttpFeatureKind>[]
): EnvironmentProviders {
  return provideHttpClient(withXhr(), ...features);
}
