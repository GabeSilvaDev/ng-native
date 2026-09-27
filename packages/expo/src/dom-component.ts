/**
 * `<dom-component>`: an Angular component rendered by a browser - DOM, CSS, anything a browser
 * runs - in a web view inside a native screen, with its inputs and outputs bound from the app's
 * template. Expo calls this a DOM component; it is not the Web Components standard.
 *
 * ```ts
 * // web/note.ts: an ordinary Angular component for the browser, in the app's own source
 * 'use dom';
 * @Component({ selector: 'app-note', template: '<textarea ...></textarea>', styles: [...] })
 * export class Note {
 *   readonly label = input('');
 *   readonly sent = output<string>();
 * }
 * export default mountInWebView(Note); // from '@ng-native/web/web-view'
 *
 * // a native screen
 * import note from './web/note.ts';
 * <dom-component [src]="note" class="flex-1"
 *   [inputs]="{ label: title() }" [outputs]="{ sent: save }" />
 * ```
 *
 * The component runs in Expo's own web view (`@expo/dom-webview`, which `expo` already installs),
 * so it is a separate JavaScript runtime from the app and only JSON crosses. It is shipped the way
 * Expo ships its `'use dom'` components: the import is a reference to a page that Expo's dev server
 * serves in development and `expo export:embed` bundles into the app for a release build (see
 * `@ng-native/metro`'s `dom-component.cjs`), and the page is found where Expo finds its own.
 *
 * - **`inputs`** go into the page before it loads, and a changed value is sent to it afterwards
 *   without reloading. Anything sent before the page is ready is sent again once it is.
 * - **`outputs`** map the component's outputs, by public name, to handlers. A name the component
 *   has no output for is an error naming the ones it does have, as `<ng-native-island>`'s is.
 * - **Errors** the page throws reach the app's `ErrorHandler`.
 */
import {
  Component,
  ElementRef,
  InjectionToken,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { Engine, type EngineNode, type NativeSyntheticEvent } from '@ng-native/fabric';
import { optional } from './native.ts';
import { registerExpoView } from './register-expo-view.ts';

/** The element is this package's, so it needs no `registerExpoViews` call of its own. */
registerExpoView('dom-component', 'ExpoDomWebViewModule');

/** A handler for one of the DOM component's outputs. */
export type DomComponentOutputHandler = (value: never) => void;

/** The functions Expo's web view defines on its view, called with the view's tag as `this`. */
export interface WebViewFunctions {
  injectJavaScript(this: { nativeTag: number }, script: string): Promise<void>;
}

/** Where the pages are, and how to reach the view once it is on screen. */
export interface DomComponentSource {
  /** Where Expo keeps DOM components' pages: the dev server, `www.bundle`, or an update. */
  readonly baseUrl: string | null;
  readonly functions: WebViewFunctions | null;
}

/** What native code gets for `import note from './web/note.ts'`. */
export interface DomComponentReference {
  readonly domComponent: string;
}

type PageMessage =
  | { type: 'ready'; outputs: string[] }
  | { type: 'output'; name: string; value: unknown }
  | { type: 'error'; message: string };

@Component({
  selector: 'dom-component',
  template: '',
  host: {
    '[source]': 'source()',
    '[injectedJavaScriptObject]': 'page()',
    '[webviewDebuggingEnabled]': 'debuggable',
    '(message)': 'receive($event)',
  },
})
export class DomComponent {
  /** Overridden in a test to load pages without a dev server. */
  static readonly SOURCE = new InjectionToken<DomComponentSource>(
    'angular-native.domComponentSource',
    {
      factory: () => {
        // Expo's own resolution, so a page is found wherever Expo would look for a DOM
        // component's: the dev server, the app's `www.bundle`, or a downloaded update.
        const base = optional(() => require('expo/src/dom/base') as { getBaseURL(): string });
        const core = optional(
          () => require('expo-modules-core') as typeof import('expo-modules-core'),
        );
        const module = core?.requireOptionalNativeModule<{
          ViewPrototypes?: Record<string, WebViewFunctions>;
        }>('ExpoDomWebViewModule');
        return {
          baseUrl: optional(() => base?.getBaseURL() ?? null),
          functions: module?.ViewPrototypes?.['ExpoDomWebViewModule'] ?? null,
        };
      },
    },
  );

  private readonly native = inject(DomComponent.SOURCE);
  private readonly engine = inject(Engine);
  private readonly node = inject<ElementRef<EngineNode>>(ElementRef).nativeElement;
  private ready = false;

  /** The DOM component, as imported: `import note from './web/note.ts'`. */
  readonly src = input.required<DomComponentReference>();
  /** Its inputs, by public name. JSON only: this crosses into another runtime. */
  readonly inputs = input<Readonly<Record<string, unknown>>>({});
  /** Handlers for its outputs, by public name. */
  readonly outputs = input<Readonly<Record<string, DomComponentOutputHandler>>>({});

  protected readonly debuggable = typeof __DEV__ === 'undefined' || __DEV__;

  protected readonly source = computed(() => {
    const { domComponent } = this.src();
    return this.native.baseUrl === null ? null : { uri: `${this.native.baseUrl}/${domComponent}` };
  });

  /** The file's name for an error message: the dev page names it, a release page is a hash. */
  private readonly name = computed(() => this.src().domComponent.split('?')[0]!);

  /**
   * What the page reads before it loads. The inputs are read untracked: a change to this prop
   * reloads the page, so a changed input is sent to the running page instead.
   */
  protected readonly page = computed(() => {
    this.src();
    return JSON.stringify({ inputs: untracked(this.inputs) });
  });

  constructor() {
    effect(() => {
      const inputs = this.inputs();
      if (this.ready) untracked(() => this.send(inputs));
    });
  }

  protected receive(event: NativeSyntheticEvent<{ data: string }>): void {
    const message = JSON.parse(event.nativeEvent.data) as PageMessage;
    if (message.type === 'ready') {
      this.checkOutputs(message.outputs);
      this.ready = true;
      this.send(this.inputs());
    } else if (message.type === 'output') {
      this.outputs()[message.name]?.(message.value as never);
    } else if (message.type === 'error') {
      throw new Error(`[angular-native] <dom-component> ${this.name()}: ${message.message}`);
    }
  }

  private checkOutputs(declared: readonly string[]): void {
    for (const name of Object.keys(this.outputs())) {
      if (!declared.includes(name)) {
        throw new Error(
          `[angular-native] <dom-component>: ${this.name()} has no output '${name}' ` +
            `(its outputs: ${declared.join(', ') || 'none'}).`,
        );
      }
    }
  }

  private send(inputs: Readonly<Record<string, unknown>>): void {
    const nativeTag = this.engine.tagOf(this.node);
    if (!this.native.functions || nativeTag === null) return;
    const message = JSON.stringify({ type: 'inputs', inputs });
    void this.native.functions.injectJavaScript.call(
      { nativeTag },
      `window.__ngNative && window.__ngNative.receive(${message}); true;`,
    );
  }
}

declare const __DEV__: boolean | undefined;
