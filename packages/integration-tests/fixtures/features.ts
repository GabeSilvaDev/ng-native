import {
  Component,
  ViewContainerRef,
  input,
  signal,
  viewChild,
  type ComponentRef,
} from '@angular/core';
import { Pressable } from '../../components/src/pressable.ts';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

@Component({
  selector: 'x-badge',
  template: `<text>[{{ label() }}]</text>`,
})
export class Badge {
  label = input('badge');
}

/** Content projection, both the default slot and a named one. */
@Component({
  selector: 'x-card',
  template: `
    <view>
      <ng-content select="[header]" />
      <ng-content />
    </view>
  `,
})
export class Card {}

@Component({
  selector: 'x-features',
  imports: [Card, Badge, Pressable, Text, View],
  template: `
    @switch (mode()) {
      @case ('a') {
        <text>mode a</text>
      }
      @case ('b') {
        <text>mode b</text>
      }
      @default {
        <text>mode other</text>
      }
    }

    @defer (when ready()) {
      <text>deferred</text>
    } @placeholder {
      <text>placeholder</text>
    }

    <x-card>
      <text header>slotted header</text>
      <text>slotted body</text>
    </x-card>

    <view #host />

    @if (showListener()) {
      <pressable (press)="noop()"><text>listener</text></pressable>
    }
  `,
})
export class Features {
  mode = signal<'a' | 'b' | 'c'>('a');
  ready = signal(false);
  showListener = signal(true);

  host = viewChild.required('host', { read: ViewContainerRef });

  noop(): void {}

  insert(): ComponentRef<Badge> {
    return this.host().createComponent(Badge);
  }
}
