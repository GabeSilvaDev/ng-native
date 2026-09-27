import { Component, computed, inject, signal } from '@angular/core';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from '@ng-native/components';
import { NativeHeader } from '@ng-native/router';
import { FieldNotes, type Note } from './field-notes.ts';
import { NotesServer } from './notes-server.ts';

/** Field notes: write, change and delete with or without a connection, and see what is waiting. */
@Component({
  selector: 'x-offline-notes',
  imports: [NativeHeader, Pressable, ScrollView, Switch, Text, TextInput, View],
  template: `
    <native-header title="Field notes" />
    <scroll-view
      class="screen"
      [contentContainerStyle]="content"
      keyboardShouldPersistTaps="handled"
    >
      <view class="banner" [class.warn]="!notes.online()" accessibilityRole="summary">
        <text class="body">{{ status() }}</text>
        @if (notes.lastError() && notes.online()) {
          <pressable accessibilityRole="button" (press)="notes.retryNow()">
            <text class="button-label">Retry now</text>
          </pressable>
        }
      </view>
      <view class="toggle-row">
        <text class="body">Airplane mode (this app only)</text>
        <switch accessibilityLabel="Airplane mode" [(checked)]="notes.airplane" />
      </view>
      <view class="compose">
        <text-input
          class="field grow"
          accessibilityLabel="New note"
          placeholder="New note"
          [(value)]="draft"
          returnKeyType="done"
          (submitEditing)="add()"
        />
        <pressable
          class="button"
          accessibilityRole="button"
          [disabled]="!notes.ready()"
          (press)="add()"
        >
          <text class="button-label">Add</text>
        </pressable>
      </view>
      @for (note of notes.notes(); track note.id) {
        <view class="card note">
          @if (editing() === note.id) {
            <text-input
              class="field"
              accessibilityLabel="Edit note"
              [(value)]="edited"
              returnKeyType="done"
              (submitEditing)="save(note)"
            />
          } @else {
            <text class="body">{{ note.text }}</text>
          }
          <view class="actions">
            <text class="hint grow">{{ note.pending ? 'Waiting to send' : 'Saved' }}</text>
            @if (editing() === note.id) {
              <pressable accessibilityRole="button" (press)="save(note)">
                <text class="button-label">Done</text>
              </pressable>
            } @else {
              <pressable
                accessibilityRole="button"
                [accessibilityLabel]="'Edit ' + note.text"
                (press)="startEditing(note)"
              >
                <text class="button-label">Edit</text>
              </pressable>
            }
            <pressable
              accessibilityRole="button"
              [accessibilityLabel]="'Delete ' + note.text"
              (press)="notes.remove(note.id)"
            >
              <text class="danger">Delete</text>
            </pressable>
            @if (!note.pending) {
              <pressable
                accessibilityRole="button"
                [accessibilityLabel]="'Change ' + note.text + ' elsewhere'"
                (press)="server.editElsewhere(note.id, note.text + ' (edited elsewhere)')"
              >
                <text class="hint">Elsewhere</text>
              </pressable>
            }
          </view>
        </view>
      }
    </scroll-view>
  `,
  styles: `
    .banner {
      padding: 12px;
      border-radius: 10px;
      background-color: var(--card);
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }
    .warn {
      background-color: var(--card-inset);
    }
    .toggle-row,
    .compose,
    .actions {
      flex-direction: row;
      align-items: center;
      gap: 12px;
    }
    .toggle-row {
      justify-content: space-between;
    }
    .grow {
      flex: 1;
    }
    .note {
      align-items: stretch;
      gap: 8px;
    }
  `,
})
export class OfflineNotes {
  protected readonly notes = inject(FieldNotes);
  protected readonly server = inject(NotesServer);
  protected readonly content = { padding: 16, gap: 12 };
  protected readonly draft = signal('');
  protected readonly editing = signal<string | null>(null);
  protected readonly edited = signal('');

  protected readonly status = computed(() => {
    const waiting = this.notes.outbox().length;
    const changes = waiting === 1 ? '1 change' : `${waiting} changes`;
    if (!this.notes.ready()) return 'Reading your notes';
    if (!this.notes.online()) return waiting ? `Offline, ${changes} waiting` : 'Offline';
    if (this.notes.sending()) return `Sending ${changes}`;
    if (waiting) return `${changes} waiting to send`;
    return 'All changes saved';
  });

  protected add(): void {
    const text = this.draft().trim();
    if (!text || !this.notes.ready()) return;
    this.notes.add(text);
    this.draft.set('');
  }

  protected startEditing(note: Note): void {
    this.edited.set(note.text);
    this.editing.set(note.id);
  }

  protected save(note: Note): void {
    const text = this.edited().trim();
    if (text && text !== note.text) this.notes.edit(note.id, text);
    this.editing.set(null);
  }
}
