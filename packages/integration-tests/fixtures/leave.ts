import { Component, signal } from '@angular/core';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

/**
 * `animate.leave` with a class whose stylesheet transitions opacity. The element has to stay in
 * the tree, faded but present, until the transition ends.
 */
@Component({
  selector: 'x-leaving',
  imports: [Text, View],
  template: `
    @if (shown()) {
      <view class="panel" animate.leave="going">
        <text>panel</text>
      </view>
    }
  `,
  styles: `
    .panel {
      opacity: 1;
      background-color: rgb(0, 0, 0);
      transition: opacity 300ms linear;
    }

    .panel.going {
      opacity: 0;
    }
  `,
})
export class Leaving {
  readonly shown = signal(true);
}

/**
 * `animate.enter` with a class carrying a `@keyframes` animation, which is what the instruction is
 * designed for. An animation plays from its own frames rather than from what was on screen, so it
 * does not matter that Angular adds the class after the element has already been committed once.
 */
@Component({
  selector: 'x-entering',
  imports: [Text, View],
  template: `
    @if (shown()) {
      <view class="panel" animate.enter="arriving">
        <text>panel</text>
      </view>
    }
  `,
  styles: `
    @keyframes arrive {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .panel {
      opacity: 1;
    }

    .panel.arriving {
      animation: arrive 300ms linear;
    }
  `,
})
export class Entering {
  readonly shown = signal(false);
}
