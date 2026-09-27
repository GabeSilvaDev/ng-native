import {
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { View } from '@ng-native/components';
import { Engine, type EngineNode, type NativeSyntheticEvent } from '@ng-native/fabric';

/**
 * Page-relative x. `locationX` is relative to the *hit target*, which for a slider is whichever
 * child happens to be under the finger, and that changes as the fill grows: using it directly
 * feeds the value back into its own geometry and saturates. Tracking a delta from page
 * coordinates is immune to which child was hit.
 */
const pageX = (event: NativeSyntheticEvent<{ pageX?: number }>): number =>
  event.nativeEvent?.pageX ?? 0;

/**
 * A draggable control living inside a scroll view. RN has no native slider (it moved out to
 * @react-native-community/slider), so this is built on the responder system directly, and it
 * exercises all three of the things raw touch handling could not express:
 *
 *  - `blockNativeResponder` stops the enclosing scroll view while the knob is being dragged
 *  - `onResponderTerminationRequest: () => false` refuses to hand the gesture back mid-drag
 *  - an ancestor's `onStartShouldSetResponderCapture` can pre-empt it entirely (see `lock`)
 */
@Component({
  imports: [View],
  selector: 'x-slider',
  template: `
    <view class="slider-track" [style]="track" (layout)="onLayout($event)">
      <view [style]="filled()"></view>
      <view [style]="knob()"></view>
    </view>
  `,
  styles: `
    .slider-track {
      background-color: var(--line);
    }
  `,
})
export class Slider {
  readonly value = model(0.35);

  private readonly width = signal(1);
  private readonly node = inject(ElementRef).nativeElement as EngineNode;

  protected readonly track = {
    height: 36,
    justifyContent: 'center',
    borderRadius: 18,
    overflow: 'hidden',
  };

  protected readonly filled = computed(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: `${Math.round(this.value() * 100)}%`,
    backgroundColor: '#3b6ef5',
  }));

  protected readonly knob = computed(() => ({
    position: 'absolute',
    left: `${Math.round(this.value() * 100)}%`,
    marginLeft: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
  }));

  constructor() {
    const engine = inject(Engine);
    const stop = engine.setResponder(this.node, {
      onStartShouldSetResponder: () => true,
      onResponderGrant: (event) => {
        this.startX = pageX(event);
        this.startValue = this.value();
      },
      onResponderMove: (event) => {
        const delta = (pageX(event) - this.startX) / this.width();
        this.value.set(Math.min(1, Math.max(0, this.startValue + delta)));
      },
      // Refuse to give the gesture up: once the knob is grabbed, a vertical drift must not
      // hand the touch to the scroll view halfway through.
      onResponderTerminationRequest: () => false,
      // And tell the native scroll view to stop scrolling while we hold it.
      blockNativeResponder: true,
    });
    inject(DestroyRef).onDestroy(stop);
  }

  protected onLayout(event: NativeSyntheticEvent<{ layout?: { width?: number } }>): void {
    this.width.set(event.nativeEvent?.layout?.width ?? 1);
  }

  private startX = 0;
  private startValue = 0;
}

/**
 * Claims any touch below it during the **capture** pass, before the target sees it. This is how
 * a scroll view takes a drag away from a button inside it, and it is the one thing bubbling
 * propagation can never express: by the time a bubble reaches an ancestor, the child has already
 * had its say.
 */
@Directive({ selector: '[captureGuard]' })
export class CaptureGuard {
  readonly captureGuard = input(false);

  constructor() {
    const engine = inject(Engine);
    const node = inject(ElementRef).nativeElement as EngineNode;
    const stop = engine.setResponder(node, {
      onStartShouldSetResponderCapture: () => this.captureGuard(),
      onResponderGrant: () => {},
      onResponderRelease: () => {},
    });
    inject(DestroyRef).onDestroy(stop);
  }
}
