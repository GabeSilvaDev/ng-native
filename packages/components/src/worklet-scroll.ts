/**
 * A worklet run on the UI thread for every scroll frame.
 *
 * ```html
 * <scroll-view [workletScroll]="parallax">
 * ```
 *
 * Reanimated's `useAnimatedScrollHandler`, as a directive. Native emits the scroll event, the UI
 * runtime runs the worklet, and a `[workletStyle]` reading the same shared value applies the
 * result - a header that collapses as the list scrolls, with the JavaScript thread uninvolved
 * from end to end.
 *
 * `ScrollWorklet` in `../reanimated.ts` is the one apps import: same selector, and it supplies the
 * real runtime itself.
 */
import {
  Directive,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  input,
} from '@angular/core';
import { Engine, type EngineNode } from '@ng-native/fabric';
import { WORKLETS, type WorkletScrollSpec } from './worklets.ts';

/** The behaviour, with the runtime left as a dependency so a test can drive a fake one. */
@Directive({ selector: '[workletScroll]' })
export class WorkletScrollBase {
  private readonly node = inject(ElementRef).nativeElement as EngineNode;
  private readonly engine = inject(Engine);
  private readonly worklets = inject(WORKLETS);
  private readonly injector = inject(Injector);

  readonly workletScroll = input.required<WorkletScrollSpec>();

  constructor() {
    // Native addresses the emitter by react tag, and a node has one only once it has been
    // committed - the same reason a worklet style waits.
    afterNextRender(() => {
      effect(
        (onCleanup) => {
          const spec = this.workletScroll();
          const tag = this.engine.tagOf(this.node);
          const shadowNode = this.engine.shadowNodeOf(this.node);
          if (tag === null || shadowNode === null) return;
          onCleanup(this.worklets.scroll({ tag, shadowNode }, spec));
        },
        { injector: this.injector },
      );
    });
  }
}
