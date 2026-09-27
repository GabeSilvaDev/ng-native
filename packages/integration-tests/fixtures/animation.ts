import { Component, signal } from '@angular/core';
import { AnimatedStyleBase } from '../../components/src/animated-style.ts';
import { View } from '../../components/src/view.ts';

@Component({
  selector: 'x-fading',
  imports: [AnimatedStyleBase, View],
  template: `<view [style]="base" [animatedStyle]="style()"><view /></view>`,
})
export class Fading {
  readonly base = { flex: 1, backgroundColor: 'red' };
  readonly style = signal<Record<string, unknown>>({ opacity: 1 });
}

/**
 * A keyframe animation carried by a component's own stylesheet, on an element that has the class
 * from the moment it is created - which is how an app writes one, and is not what the engine
 * tests exercise: they add the class after mounting.
 */
@Component({
  selector: 'x-pulsing',
  imports: [View],
  template: `<view class="pulse" nativeID="pulse"></view>`,
  styles: `
    @keyframes pulse {
      from {
        opacity: 0.25;
      }
      to {
        opacity: 1;
      }
    }
    .pulse {
      width: 40px;
      height: 40px;
      animation: pulse 100ms linear 2;
    }
  `,
})
export class Pulsing {}
