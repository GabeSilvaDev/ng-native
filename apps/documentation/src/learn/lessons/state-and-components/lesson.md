---
title: Touch
---

A phone has no click. A finger goes down, may move, and comes up, and the responder system decides
which view the touch belongs to. `<pressable>` is the view that takes part in that: it claims the
touch, works out with nested controls and scrolling ancestors which of them keeps it, and emits
`press` when a short touch ends without being canceled.

## Tick a habit off

Make each card a `<pressable>`, import `Pressable`, and flip the habit in the signal when it is
pressed:

<!-- prettier-ignore -->
```html
<pressable class="habit" accessibilityRole="button" (press)="toggle(habit.id)">
  ...
</pressable>
```

```ts
protected toggle(id: string): void {
  this.habits.update((habits) =>
    habits.map((habit) => (habit.id === id ? { ...habit, done: !habit.done } : habit)),
  );
}
```

Toggling by `id` rather than `name` is what keeps this correct once two habits can share a name:
matching on `name` would flip every habit called the same thing at once.

`accessibilityRole="button"` is what VoiceOver and TalkBack announce, and what a screen reader
user can activate: there is no `<button>` element to carry the role, so the pressable says it.

A touch that wanders too far before lifting is canceled, and is not a press. How far it may go is
`pressRetentionOffset`, which reaches past the card's visible edge, so crossing the edge does not
cancel the press straight away. A touch held past the long-press delay emits `longPress` instead
of `press`.

## Show the press

A card that gives nothing back under a finger feels broken. The engine applies `:active` to the
view holding the touch responder and to its ancestors. Here the pressable claims the touch, so
`.habit:active` changes the card the moment it is touched:

```css
.habit:active {
  background-color: #e4e4e7;
}
```

It is written as on the web, but set by the engine from the responder rather than by a browser.
It clears when the touch is released or canceled, or when another view, such as a scroll view
starting to scroll, takes the touch over.

## Give each row a component of its own

Move the card into `habit-row.ts` as a `HabitRow` component: `name` and `done` as inputs, and a
`toggle` output the pressable emits with `(press)="toggle.emit()"`. The `.habit`, `:active` and
`.status` rules move with it.

```html
<habit-row [name]="habit.name" [done]="habit.done" (toggle)="toggle(habit.id)" />
```

Look at it in X-ray. `<habit-row>` is a `View` of its own. On a phone a component's host element is
a real native view, which lays out like any other: it is a flex child of the scroll view's content
container, and the pressable inside it is its child.
