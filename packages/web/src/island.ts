/**
 * `<ng-native-island>`: an Angular Native component, placed in an ordinary Angular template.
 *
 * `<view>`, `<text>` and `<pressable>` cannot be written straight into a web app's own templates:
 * an Angular app has one renderer, and a web app's is the DOM's, which does not know what a
 * `<view>` is. This element is the boundary. It mounts the component inside it with
 * `mount(element, component, { injector })`, so the component renders through this package's
 * renderer while sharing the surrounding app's services and change detection - see `mount.ts`.
 *
 * ```html
 * <ng-native-island
 *   [component]="Wallet"
 *   [inputs]="{ userId: user().id }"
 *   [outputs]="{ paid: onPaid }"
 * />
 * ```
 *
 * - `inputs` are by the component's public input names. A changed object is set on the mounted
 *   component, not remounted, so its state survives.
 * - `outputs` map output names to handlers. A name the component has no output for throws,
 *   naming the ones it does have, rather than never firing.
 * - Changing `component` destroys the old one and mounts the new one in its place.
 * - The island goes when this element does: `@if`, a route change, or the host being destroyed.
 */
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  effect,
  inject,
  input,
  reflectComponentType,
  untracked,
  type OutputRefSubscription,
  type Type,
} from '@angular/core';
import { mount, type MountResult } from './mount.ts';

/** A handler for one of the mounted component's outputs. */
export type IslandOutputHandler = (value: never) => void;

interface Subscribable {
  subscribe(handler: (value: unknown) => void): OutputRefSubscription;
}

@Component({
  selector: 'ng-native-island',
  template: '',
})
export class NgNativeIsland {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  /** The Angular Native component to mount. Changing it replaces the mounted one. */
  readonly component = input.required<Type<unknown>>();
  /** Its inputs, by public name. */
  readonly inputs = input<Readonly<Record<string, unknown>>>({});
  /** Handlers for its outputs, by public name. */
  readonly outputs = input<Readonly<Record<string, IslandOutputHandler>>>({});

  private island?: MountResult;
  private subscriptions: OutputRefSubscription[] = [];

  constructor() {
    // Mount, or remount when the component changes. The inputs are read untracked here: they go
    // in before the first render, and a later change is the next effect's job, not a remount.
    effect(() => {
      const component = this.component();
      untracked(() => {
        this.unmount();
        this.island = mount(this.element, component, {
          injector: this.injector,
          inputs: this.inputs(),
        });
      });
    });

    // A changed input is set on the mounted component. Also runs after a remount, which is
    // harmless: setting an input to the value it already has changes nothing.
    effect(() => {
      const inputs = this.inputs();
      this.component();
      untracked(() => {
        for (const [name, value] of Object.entries(inputs)) {
          this.island?.componentRef.setInput(name, value);
        }
      });
    });

    // The handlers, resubscribed whenever they or the component change.
    effect(() => {
      const outputs = this.outputs();
      const component = this.component();
      untracked(() => this.subscribe(component, outputs));
    });

    inject(DestroyRef).onDestroy(() => this.unmount());
  }

  private subscribe(
    component: Type<unknown>,
    outputs: Readonly<Record<string, IslandOutputHandler>>,
  ): void {
    this.unsubscribe();
    const instance = this.island?.componentRef.instance as Record<string, Subscribable>;
    const declared = reflectComponentType(component)?.outputs ?? [];
    for (const [name, handler] of Object.entries(outputs)) {
      const output = declared.find((candidate) => candidate.templateName === name);
      if (!output) {
        const known = declared.map((candidate) => candidate.templateName).join(', ') || 'none';
        throw new Error(
          `[angular-native] <ng-native-island>: ${component.name} has no output '${name}' ` +
            `(its outputs: ${known}).`,
        );
      }
      const emitter = instance[output.propName]!;
      this.subscriptions.push(emitter.subscribe(handler as (value: unknown) => void));
    }
  }

  private unsubscribe(): void {
    for (const subscription of this.subscriptions) subscription.unsubscribe();
    this.subscriptions = [];
  }

  private unmount(): void {
    this.unsubscribe();
    this.island?.destroy();
    this.island = undefined;
  }
}
