import { Component } from '@angular/core';
import { View } from '../../components/src/view.ts';

@Component({
  selector: 'x-gradient-host',
  imports: [View],
  template: `<view nativeID="hero"></view>`,
  styles: `
    #hero {
      background-image: linear-gradient(to bottom right, red, blue 60%);
    }
  `,
})
export class GradientHost {}

@Component({
  selector: 'x-themed-gradient',
  imports: [View],
  template: `<view nativeID="themed"></view>`,
  styles: `
    #themed {
      background-image: linear-gradient(to right, var(--start), var(--middle) 50%, var(--end));
    }
  `,
})
export class ThemedGradient {}
