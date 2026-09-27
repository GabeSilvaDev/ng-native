/**
 * Fixture for `scroll-view.test.ts`. See `button-app.ts`'s doc comment for why a real
 * `@Component` has to live in its own file rather than inside a `.test.ts` one.
 *
 * Exercises `ScrollView`'s imperative `scrollTo`/`scrollToEnd`, which reach `browser-engine.ts`'s
 * `scrollTo`/`scrollToEnd` command handlers - the same real `<scroll-view>` `Carousel` (a
 * `packages/ui` composite, deleted with the rest of that package) drove, with the carousel's own
 * snap-to-item arithmetic left out: that was business logic belonging to the deleted component,
 * not something this renderer does.
 */
import { Component } from '@angular/core';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';

@Component({
  selector: 'app-root',
  imports: [Pressable, ScrollView, Text, View],
  template: `
    <view id="screen">
      <scroll-view id="content" horizontal #sv="scrollView">
        @for (slide of slides; track slide) {
          <view [id]="'item-' + slide"
            ><text>{{ slide }}</text></view
          >
        }
      </scroll-view>
      <pressable id="jump" (press)="sv.scrollTo({ x: 300 })"><text>Jump</text></pressable>
      <pressable id="jump-instant" (press)="sv.scrollTo({ x: 600, animated: false })">
        <text>Jump instantly</text>
      </pressable>
      <pressable id="jump-end" (press)="sv.scrollToEnd({ animated: false })">
        <text>Jump to end</text>
      </pressable>
    </view>
  `,
})
export class ScrollViewApp {
  readonly slides = [1, 2, 3];
}
