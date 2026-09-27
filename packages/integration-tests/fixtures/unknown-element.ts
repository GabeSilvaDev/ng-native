import { Component, Directive, signal } from '@angular/core';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

/** A user component on an element selector: its host is an element no table has heard of. */
@Component({
  selector: 'x-card',
  imports: [Text],
  template: '<text>Card</text>',
})
export class Card {}

/** A component on an attribute selector, written on an element name nothing registers. */
@Component({
  selector: '[badge]',
  imports: [Text],
  template: '<text>Badge</text>',
})
export class Badge {}

/** A directive, not a component, that owns an element by name, as Angular's router outlet does. */
@Directive({ selector: 'x-slot' })
export class Slot {}

/** Everything that is allowed to be an unregistered element, and nothing that is not. */
@Component({
  selector: 'x-known-elements',
  imports: [Card, Badge, Slot, Text, View],
  template: `
    <view>
      <x-card />
      <x-pill badge></x-pill>
      <x-slot></x-slot>
      @if (late()) {
        <x-card />
      }
    </view>
  `,
})
export class KnownElements {
  readonly late = signal(false);
}

/** A typo: nothing claims it, so it renders as an empty view. */
@Component({
  selector: 'x-typo',
  imports: [Text, View],
  template: `
    <view>
      <veiw><text>Lost</text></veiw>
      <veiw></veiw>
    </view>
  `,
})
export class Typo {}
