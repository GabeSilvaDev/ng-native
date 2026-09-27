---
title: A form for new habits
---

The form is Signal Forms, unchanged. What is new is the field it binds to. `<text-input>` commits
as the platform's own text field, a `UITextField` on iOS and an `EditText` on Android, so the
keyboard, the cursor, autocorrect and the return key all belong to the phone. The binding has to
meet that field halfway, and this lesson is about where it does.

## Bind a native field

Add a file, `new-habit.ts`, with the + after the file tabs. Give it a `NewHabit` component with a
form over one name, and bind a `<text-input>` to it:

```ts
import { Component, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { TextInput, View } from '@ng-native/components';

@Component({
  selector: 'new-habit',
  imports: [FormField, TextInput, View],
  template: `
    <view class="mt-2 flex-row gap-2">
      <text-input
        class="flex-1 rounded-xl bg-white px-4 py-3 text-base text-zinc-900"
        placeholder="New habit"
        [formField]="habit.name"
      />
    </view>
  `,
})
export class NewHabit {
  protected readonly model = signal({ name: '' });
  protected readonly habit = form(this.model);
}
```

Then put `<new-habit />` under the count in `app.ts`, above the `<scroll-view>`, and add
`NewHabit` to its imports.

There is no `ControlValueAccessor` here, and no adapter. `FormField` binds straight to the
control's `value` model, which `<text-input>` has. It has to be in the component's `imports`:
without it, `[formField]` binds nothing, and the field keeps what is typed while the form never
hears of it. Without a form, `[(value)]` binds a signal the same way; there is no `ngModel`, and no
DOM input to bind.

Any binding makes the field controlled, one-way `[value]` included: if the app does not take up
the change the field reports, the component puts the bound value back. The native field numbers
each change, and a value sent back carries the number it answers, so a stale update cannot
overwrite what has been typed since. When the form takes the text as typed, as it does here,
nothing is sent back at all.

## Validate the way a keyboard works

Import `required` and `maxLength` from `@angular/forms/signals`, and `Text` from
`@ng-native/components` for the component's imports. Add rules to the form, and show the first
error under the field:

```ts
protected readonly habit = form(this.model, (path) => {
  required(path.name, { message: 'Give the habit a name' });
  maxLength(path.name, 30);
});
```

<!-- prettier-ignore -->
```html
@if (habit.name().touched() && habit.name().invalid()) {
  <text class="text-sm text-red-600" accessibilityRole="alert">
    {{ habit.name().errors()[0]?.message }}
  </text>
}
```

Two things behave differently from a browser. There is no DOM `blur` for the form to listen to:
`<text-input>` emits `touch` when the native field reports a blur, and `FormField` marks the field
touched from it. Focus and the keyboard are separate things, and putting the keyboard away does
not always mean the field has lost focus. And `maxLength` is not only a rule: `FormField` passes it
to the control's own `maxLength`, which the native field enforces as the person types, so the
31st character never appears rather than appearing and being complained about.

`accessibilityRole="alert"` tells VoiceOver and TalkBack the text is important. It does not
validate anything, and the checks here cannot show how a screen reader announces it: try the
error with VoiceOver and TalkBack on a device.

## Add from the button and the return key

Give `NewHabit` an output, a button, and a method that submits the form:

```ts
readonly add = output<string>();

protected save(): void {
  void submit(this.habit, async () => {
    this.add.emit(this.model().name);
    this.habit().reset({ name: '' });
    return undefined;
  });
}
```

<!-- prettier-ignore -->
```html
<pressable
  class="justify-center rounded-xl bg-emerald-600 px-4 active:bg-emerald-700"
  accessibilityRole="button"
  (press)="save()"
>
  <text class="font-semibold text-white">Add</text>
</pressable>
```

The return key can add too. `returnKeyType` labels it, and `(submitEditing)` fires when it is
pressed:

```html
<text-input
  placeholder="New habit"
  returnKeyType="done"
  submitBehavior="submit"
  [formField]="habit.name"
  (submitEditing)="save()"
/>
```

`submitBehavior` decides what else the return key does. A single-line field defaults to
`blurAndSubmit`, which submits and loses focus. `submit` submits without the blur, so the field
keeps focus and the keyboard stays available for the next habit. Resetting the form clears its
value and its touched state.

In `app.ts`, listen to the output and put the new habit on the end of the list:

```html
<new-habit (add)="add($event)" />
```

```ts
private nextHabitId = 0;

protected add(name: string): void {
  const id = `habit-${++this.nextHabitId}`;
  this.habits.update((habits) => [...habits, { id, name, done: false }]);
}
```

`habit.id`, not `habit.name`, is what `@for` tracks and what `toggle()` matches, so every new habit
needs an id no other habit has, even when two share a name. A counter is enough while the habits
live in memory; habits that are saved need ids that stay unique across launches of the app.
