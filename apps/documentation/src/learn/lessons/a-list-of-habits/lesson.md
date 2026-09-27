---
title: A list of habits
---

One card is a design. The tracker needs one per habit, drawn from data. The data is a signal and
the cards come from `@for`, as in any Angular app. The part worth knowing is what that turns into
on a phone.

## Draw a card for every habit

Keep the habits in a signal, and draw the card for each:

```ts
import { Component, signal } from '@angular/core';

interface Habit {
  readonly id: string;
  readonly name: string;
  readonly done: boolean;
}

export class App {
  protected readonly habits = signal<readonly Habit[]>([
    { id: 'water', name: 'Drink water', done: false },
    { id: 'read', name: 'Read ten pages', done: false },
    { id: 'walk', name: 'Walk', done: true },
  ]);
}
```

<!-- prettier-ignore -->
```html
@for (habit of habits(); track habit.id) {
  <view class="habit">
    <text>{{ habit.name }}</text>
    <text class="status">To do</text>
  </view>
}
```

Every card is a set of native views, created when its habit appears and destroyed when it goes.
A stable, unique `id` lets Angular keep the views of a row it already has when the list changes,
and move them when the list is reordered, rather than tear them down and build them again, which
on a phone is the expensive part. Names make poor keys, because they can change and they can
repeat: two tracked rows with the same key leave Angular unable to tell which is which.

## Say what is done, and what is left

Show each habit's status, replace the hand-written 3 with a count of what is left, and give the
`@for` an `@empty` block for when there are no habits at all:

```html
<text class="status">{{ habit.done ? 'Done' : 'To do' }}</text>
```

```ts
protected readonly remaining = computed(() => this.habits().filter((habit) => !habit.done).length);
```

<!-- prettier-ignore -->
```html
<text class="summary">{{ remaining() }} left to do</text>
@for (habit of habits(); track habit.id) {
  ...
} @empty {
  <text class="summary">No habits yet</text>
}
```

Import `computed` from `@angular/core` alongside `signal`.

## Let the list scroll

A native screen does not scroll on its own, the way a web page does. Content taller than the
screen is cut off unless it is inside a `<scroll-view>`. Import `ScrollView`, and put the `@for`
and its `@empty` inside one, with the title and the count above it so they stay where they are
while the habits move:

<!-- prettier-ignore -->
```html
<text class="summary">{{ remaining() }} left to do</text>
<scroll-view [contentContainerStyle]="{ gap: 8 }">
  @for (habit of habits(); track habit.id) {
    ...
  } @empty {
    ...
  }
</scroll-view>
```

A native scroll view is two views: the frame, which stays the size it is given, and a content
container inside it, which grows with the rows and moves when they scroll. A class or `[style]` on
`<scroll-view>` styles the frame. `contentContainerStyle` styles the content container, so padding
and gaps between the rows go there, as numbers in the same units as `px` in a stylesheet. The
frame grows to fill the space left under the count by default, as React Native's own scroll view
does.

To see it scroll, add a few more habits to the signal for a moment, then take them out again: the
lessons after this one start from these three.

Every row in a scroll view is a real native view, all the time, including the ones off screen. A
very long list wants [`<virtual-list>`](/packages/components/lists) instead, which works out which
rows are on screen, plus a small buffer, as `window()`. Your own `@for` renders `list.window()`
rather than the whole list, and only those rows exist as native views.
