import { Component, DestroyRef, ElementRef, inject } from '@angular/core';
import { Engine, type EngineNode } from '@ng-native/fabric';
import { View } from '../../components/src/view.ts';

/**
 * Code in the dispatch path that is not an Angular listener: a responder handler, and a listener
 * registered on the engine directly, as the gesture and worklet layers do. Angular wraps its own
 * template listeners in a try/catch that reaches the `ErrorHandler`; nothing wraps these.
 */
@Component({
  selector: 'x-event-errors',
  imports: [View],
  template: `<view nativeID="target" (touchEnd)="bubbled.push('view')"></view>`,
  host: { '(touchEnd)': "bubbled.push('host')" },
})
export class EventErrors {
  readonly bubbled: string[] = [];
  private readonly engine = inject(Engine);

  constructor() {
    const host = inject(ElementRef).nativeElement as EngineNode;
    const stops = [
      this.engine.setResponder(host, {
        onStartShouldSetResponder: () => true,
        onResponderGrant: () => {
          throw new Error('grant failed');
        },
      }),
      this.engine.setEventListener(host, 'topWillAppear', () => {
        throw new Error('willAppear failed');
      }),
    ];
    inject(DestroyRef).onDestroy(() => stops.forEach((stop) => stop()));
  }
}
