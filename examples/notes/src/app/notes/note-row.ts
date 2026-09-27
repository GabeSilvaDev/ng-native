import { Component, computed, input, output } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucidePin } from '@ng-icons/lucide';
import { NgIcon } from '@ng-native/icons';
import { Pressable, Text, View } from '@ng-native/components';
import { excerpt, type Note } from '../data/note.ts';

const DAY = 1000 * 60 * 60 * 24;

/** A relative-ish timestamp: time today, "Yesterday", a weekday, or a short date further back. */
function formatUpdated(updatedAt: number, now = Date.now()): string {
  const date = new Date(updatedAt);
  const diffDays = Math.floor((startOfDay(now) - startOfDay(updatedAt)) / DAY);
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function startOfDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** One row in the notes list: title, a preview of the body, when it changed, and a pin. */
@Component({
  selector: 'app-note-row',
  imports: [NgIcon, Pressable, Text, View],
  providers: [provideIcons({ lucidePin })],
  template: `
    <pressable
      class="flex-row items-start gap-3 border-b-hairline border-zinc-200 px-5 py-4 active:bg-zinc-100 dark:border-zinc-800 dark:active:bg-zinc-900"
      accessibilityRole="button"
      [accessibilityLabel]="note().title || 'Untitled note'"
      (press)="open.emit()"
      (longPress)="pin.emit()"
    >
      <view class="mt-1 flex-1">
        <view class="flex-row items-center gap-1.5">
          @if (note().pinned) {
            <ng-icon name="lucidePin" size="13" color="#f59e0b" />
          }
          <text
            class="flex-1 text-base font-semibold text-zinc-900 dark:text-white"
            [numberOfLines]="1"
            >{{ note().title || 'Untitled note' }}</text
          >
          <text class="text-xs text-zinc-400">{{ updated() }}</text>
        </view>
        @if (preview()) {
          <text class="mt-1 text-sm text-zinc-500" [numberOfLines]="2">{{ preview() }}</text>
        }
      </view>
    </pressable>
  `,
})
export class NoteRow {
  readonly note = input.required<Note>();

  readonly open = output<void>();
  readonly pin = output<void>();

  protected readonly preview = computed(() => excerpt(this.note().body, 120));
  protected readonly updated = computed(() => formatUpdated(this.note().updatedAt));
}
