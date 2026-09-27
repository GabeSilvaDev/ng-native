/**
 * The web half of `<dom-component>`: an Angular DOM component, mounted in the page a native web
 * view loaded, and talking to the app around it.
 *
 * ```ts
 * // web/note.ts - an ordinary Angular DOM component, in the app's own source
 * 'use dom';
 * @Component({ selector: 'app-note', template: '<textarea ...></textarea>', styles: [...] })
 * export class Note { ... }
 *
 * export default mountInWebView(Note);
 * ```
 *
 * The default export is what native code imports and hands to `<dom-component [src]>`. On native
 * the build replaces the whole file with a reference to its page (see `@ng-native/metro`'s
 * `dom-component.cjs`), so the type is the same on both sides and nothing here runs there.
 *
 * The page is a separate JavaScript runtime from the app, so only JSON crosses:
 *
 * - **Inputs** arrive before the page loads, in the object the web view injected
 *   (`ReactNativeWebView.injectedObjectJson()`), and later as `inputs` messages the app runs
 *   through `window.__ngNative.receive`. Each is set by public name, without remounting.
 * - **Outputs** are every output the component declares, a `model()`'s `...Change` included. Each
 *   emit is posted to the app as `{ type: 'output', name, value }`.
 * - **`ready`** is posted once mounted, with the output names, so the app can check its handlers
 *   against them and re-send any input that changed while the page was loading.
 * - **Errors** are posted as `{ type: 'error', message }`: a web view's console is in Safari's
 *   inspector, and the app's is where someone is looking.
 *
 * This is the same protocol shape as Expo's DOM components, which do this for React.
 */
import {
  ErrorHandler,
  createComponent,
  provideZonelessChangeDetection,
  reflectComponentType,
  type ComponentRef,
  type EnvironmentProviders,
  type OutputRef,
  type Provider,
  type Type,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';

/** What the native web view puts on `window` for the page. */
interface NativeBridge {
  injectedObjectJson?(): string;
  postMessage(data: string): void;
}

type Message =
  | { type: 'ready'; outputs: string[] }
  | { type: 'output'; name: string; value: unknown }
  | { type: 'error'; message: string };

/**
 * A DOM component, as `export default mountInWebView(...)` gives it. Native code imports this and
 * passes it to `<dom-component [src]>`.
 */
export interface DomComponentFile<T = unknown> {
  /** The page to load. Set by the build in native code; empty in the web view itself. */
  readonly domComponent: string;
  /** The mounted component, in the web view only. */
  readonly mounted?: Promise<ComponentRef<T>>;
}

export interface MountInWebViewOptions {
  readonly providers?: (Provider | EnvironmentProviders)[];
}

export function mountInWebView<T>(
  component: Type<T>,
  options: MountInWebViewOptions = {},
): DomComponentFile<T> {
  return { domComponent: '', mounted: mount(component, options) };
}

async function mount<T>(
  component: Type<T>,
  options: MountInWebViewOptions,
): Promise<ComponentRef<T>> {
  const bridge = (window as unknown as { ReactNativeWebView?: NativeBridge }).ReactNativeWebView;
  const post = (message: Message) => bridge?.postMessage(JSON.stringify(message));
  const initial = readInjected(bridge);

  const appRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      {
        provide: ErrorHandler,
        useValue: {
          handleError: (error: unknown) => post({ type: 'error', message: describe(error) }),
        },
      },
      ...(options.providers ?? []),
    ],
  });

  // The page is the component's, edge to edge, so the browser's default body margin goes.
  document.body.style.margin = '0';
  const host =
    document.querySelector('ng-native-web-root') ??
    document.body.appendChild(document.createElement('ng-native-web-root'));
  const ref = createComponent(component, {
    environmentInjector: appRef.injector,
    hostElement: host,
  });
  setInputs(ref, initial.inputs ?? {});
  appRef.attachView(ref.hostView);

  const outputs = reflectComponentType(component)?.outputs ?? [];
  const instance = ref.instance as Record<string, OutputRef<unknown>>;
  for (const { propName, templateName } of outputs) {
    instance[propName]!.subscribe((value) => post({ type: 'output', name: templateName, value }));
  }

  (window as unknown as { __ngNative: unknown }).__ngNative = {
    receive(message: { type: string; inputs?: Record<string, unknown> }) {
      if (message.type === 'inputs') setInputs(ref, message.inputs ?? {});
    },
  };

  ref.changeDetectorRef.detectChanges();
  post({ type: 'ready', outputs: outputs.map((output) => output.templateName) });
  return ref;
}

function readInjected(bridge: NativeBridge | undefined): { inputs?: Record<string, unknown> } {
  try {
    return JSON.parse(bridge?.injectedObjectJson?.() ?? '{}');
  } catch {
    return {};
  }
}

function setInputs(ref: ComponentRef<unknown>, inputs: Record<string, unknown>): void {
  for (const [name, value] of Object.entries(inputs)) ref.setInput(name, value);
}

function describe(error: unknown): string {
  return error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
}
