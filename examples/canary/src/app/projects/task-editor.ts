import { Component, type OnInit, computed, inject, input, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import {
  Pressable,
  SafeAreaProvider,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from '@ng-native/components';
import { Dialogs } from '@ng-native/device';
import { NativeNavigation } from '@ng-native/router';
import { ProjectStore, type Task } from './project-data.ts';

/**
 * Editing a task, or writing a new one, in a sheet. While it holds unsaved changes the sheet
 * refuses a swipe down and asks whether to discard them, as Reminders and Mail do.
 */
@Component({
  selector: 'x-task-editor',
  imports: [
    FormField,
    Pressable,
    SafeAreaProvider,
    SafeAreaView,
    ScrollView,
    Switch,
    Text,
    TextInput,
    View,
  ],
  template: `
    <safe-area-provider [reportInsets]="false" class="screen">
      <safe-area-view class="screen" [edges]="['bottom']">
        <view class="bar">
          <pressable accessibilityRole="button" (press)="cancel()">
            <text class="action">Cancel</text>
          </pressable>
          <text class="strong">{{ tid() ? 'Edit task' : 'New task' }}</text>
          <pressable accessibilityRole="button" [disabled]="f().submitting()" (press)="save()">
            <text class="action strong">Save</text>
          </pressable>
        </view>
        <scroll-view
          class="screen"
          [contentContainerStyle]="content"
          [automaticallyAdjustKeyboardInsets]="true"
          keyboardShouldPersistTaps="handled"
        >
          <text-input
            class="field"
            accessibilityLabel="Title"
            placeholder="Title"
            [formField]="f.title"
            returnKeyType="next"
            (submitEditing)="notes.focus()"
          />
          @if (f.title().touched() && f.title().invalid()) {
            <text class="hint danger" accessibilityRole="alert">Give the task a title</text>
          }
          <text-input
            #notes
            class="field notes"
            accessibilityLabel="Notes"
            placeholder="Notes"
            [multiline]="true"
            [formField]="f.notes"
          />
          <view class="toggle">
            <text class="body">Done</text>
            <switch accessibilityLabel="Done" [formField]="f.done" />
          </view>
        </scroll-view>
      </safe-area-view>
    </safe-area-provider>
  `,
  host: {
    '[preventNativeDismiss]': 'dirty()',
    '(nativeDismissCancelled)': 'cancel()',
  },
  styles: `
    .bar {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px 8px;
    }
    .action {
      color: var(--accent);
      font-size: 17px;
    }
    .notes {
      min-height: 110px;
    }
    .toggle {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }
  `,
})
export class TaskEditor implements OnInit {
  readonly pid = input.required<string>();
  /** The task being edited; none for a new one. */
  readonly tid = input<string>();
  private readonly store = inject(ProjectStore);
  private readonly nav = inject(NativeNavigation);
  private readonly dialogs = inject(Dialogs);

  protected readonly content = { padding: 20, gap: 12 };
  private readonly original = signal<Task | null>(null);
  protected readonly data = signal<Task>({
    id: '',
    projectId: '',
    title: '',
    notes: '',
    done: false,
    assignee: '',
    version: 0,
  });
  protected readonly f = form(this.data, (path) => required(path.title));
  /** Changed from what was loaded: what a swipe down would lose. */
  protected readonly dirty = computed(() => {
    const now = this.data();
    const was = this.original();
    return !!was && (now.title !== was.title || now.notes !== was.notes || now.done !== was.done);
  });

  ngOnInit(): void {
    const id = this.tid();
    const task = (id && this.store.task(id)) || this.store.draft(this.pid());
    this.original.set(task);
    this.data.set(task);
  }

  protected async save(): Promise<void> {
    const ok = await submit(this.f, async () => undefined);
    if (!ok) return;
    void this.store.save(this.data());
    this.original.set(this.data());
    this.nav.back();
  }

  /** Leave, asking first when there is something to lose. */
  protected async cancel(): Promise<void> {
    if (this.dirty()) {
      const discard = await this.dialogs.confirm('Discard your changes?', {
        confirm: 'Discard',
        cancel: 'Keep editing',
        destructive: true,
      });
      if (!discard) return;
    }
    this.original.set(this.data());
    this.nav.back();
  }
}
