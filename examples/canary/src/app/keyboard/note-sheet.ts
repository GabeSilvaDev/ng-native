import { Component, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import {
  Pressable,
  SafeAreaProvider,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from '@ng-native/components';
import { NativeNavigation } from '@ng-native/router';
import { NoteDrafts } from './note-drafts.ts';

/** A small form in a sheet: the keyboard rises over a sheet, and a submit closes it. */
@Component({
  selector: 'x-note-sheet',
  imports: [
    FormField,
    Pressable,
    SafeAreaProvider,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    View,
  ],
  template: `
    <safe-area-provider [reportInsets]="false" class="screen">
      <safe-area-view class="screen" [edges]="['bottom']">
        <scroll-view
          class="screen"
          [contentContainerStyle]="content"
          [automaticallyAdjustKeyboardInsets]="true"
          keyboardShouldPersistTaps="handled"
        >
          <text class="heading">Note</text>
          <text-input
            class="field"
            accessibilityLabel="Title"
            placeholder="Title"
            [formField]="f.title"
            returnKeyType="next"
            (submitEditing)="body.focus()"
          />
          <text-input
            #body
            class="field body-field"
            accessibilityLabel="Body"
            placeholder="Body"
            [multiline]="true"
            [formField]="f.body"
          />
          @if (f.title().touched() && f.title().invalid()) {
            <text class="hint danger" accessibilityRole="alert">Give the note a title</text>
          }
          <view class="actions">
            <pressable class="card" accessibilityRole="button" (press)="nav.back()">
              <text class="button-label">Cancel</text>
            </pressable>
            <pressable class="button" accessibilityRole="button" (press)="save()">
              <text class="button-label">Save</text>
            </pressable>
          </view>
        </scroll-view>
      </safe-area-view>
    </safe-area-provider>
  `,
  styles: `
    .body-field {
      min-height: 120px;
    }
    .actions {
      flex-direction: row;
      gap: 12px;
      justify-content: flex-end;
    }
  `,
})
export class NoteSheet {
  protected readonly nav = inject(NativeNavigation);
  private readonly drafts = inject(NoteDrafts);
  protected readonly content = { padding: 20, gap: 12 };
  protected readonly data = signal({ title: '', body: '' });
  protected readonly f = form(this.data, (path) => required(path.title));

  protected async save(): Promise<void> {
    const ok = await submit(this.f, async () => undefined);
    if (!ok) return;
    this.drafts.saved.set(this.data().title);
    this.nav.back();
  }
}
