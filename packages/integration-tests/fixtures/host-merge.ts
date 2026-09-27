import { Component, computed, input } from '@angular/core';
import { View } from '../../components/src/view.ts';

/**
 * A styled component in the usual shape: it computes its own host `class` and its own host
 * `[style]`, and takes a `class` input so a caller's classes can be folded into its own.
 */
@Component({
  imports: [],
  selector: 'x-merges',
  template: ``,
  host: { '[class]': 'classes()', '[style]': 'box' },
})
export class Merges {
  readonly userClass = input<string>('', { alias: 'class' });
  protected readonly box = { paddingTop: 3 };
  // The component's own classes first, the caller's appended - a plain join, so any conflict
  // between the two is left to the stylesheet.
  protected readonly classes = computed(() => `own ${this.userClass()}`.trim());
}

/**
 * The same, minus the `class` input - a component that styles its host but never expected a
 * caller to add to it.
 */
@Component({
  imports: [],
  selector: 'x-no-input',
  template: ``,
  host: { '[class]': 'classes()', '[style]': 'box' },
})
export class NoInput {
  protected readonly box = { paddingTop: 3 };
  protected readonly classes = computed(() => 'own');
}

@Component({
  imports: [Merges, NoInput, View],
  selector: 'x-host-merge',
  template: `
    <x-merges nativeID="with-input" class="caller" [style]="{ marginTop: 9 }" />
    <x-no-input nativeID="without-input" class="caller" [style]="{ marginTop: 9 }" />
    <x-merges nativeID="style-conflict" [style]="{ paddingTop: 11 }" />
    <x-no-input nativeID="bound-class" [class]="'caller'" />
    <x-merges nativeID="conflict-with-input" class="loud" />
    <x-no-input nativeID="conflict-no-input" class="loud" />
  `,
  styles: `
    .own {
      border-top-width: 1px;
    }
    .caller {
      border-bottom-width: 2px;
    }
  `,
})
export class HostMerge {}
