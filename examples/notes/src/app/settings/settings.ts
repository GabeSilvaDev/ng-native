import { Component, computed, inject } from '@angular/core';
import { Dialogs } from '@ng-native/device';
import { Pressable, SafeAreaView, ScrollView, Switch, Text, View } from '@ng-native/components';
import { Notes } from '../sync/notes.ts';

function formatLastSynced(timestamp: number | null): string {
  if (timestamp === null) return 'Never';
  const diffMinutes = Math.round((Date.now() - timestamp) / 60_000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return new Date(timestamp).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

/** Sync, and a way to wipe the local cache - the fake server that makes offline demonstrable. */
@Component({
  selector: 'app-settings',
  imports: [Pressable, SafeAreaView, ScrollView, Switch, Text, View],
  template: `
    <safe-area-view class="flex-1 bg-zinc-100 dark:bg-black" [edges]="['top']">
      <scroll-view class="flex-1">
        <text class="px-5 pt-4 pb-3 text-3xl font-bold text-zinc-900 dark:text-white"
          >Settings</text
        >

        <text class="px-5 pt-4 pb-2 text-xs text-zinc-500 uppercase">Sync</text>
        <view class="bg-white dark:bg-zinc-900 ios:mx-4 ios:rounded-xl">
          <view class="flex-row items-center justify-between px-4 py-3">
            <text class="text-zinc-900 dark:text-white">Sync notes</text>
            <switch
              accessibilityLabel="Sync notes"
              [checked]="syncEnabled()"
              (checkedChange)="setSyncEnabled($event)"
            />
          </view>
          <view
            class="flex-row items-center justify-between border-t-hairline border-zinc-200 px-4 py-3 dark:border-zinc-800"
          >
            <text class="text-zinc-900 dark:text-white">Last synced</text>
            <text class="text-zinc-500">{{ lastSynced() }}</text>
          </view>
          @if (pendingCount() > 0) {
            <text class="px-4 pb-3 text-sm text-amber-600">
              {{ pendingCount() }} note{{ pendingCount() === 1 ? '' : 's' }} waiting to sync.
            </text>
          }
        </view>

        <text class="px-5 pt-6 pb-2 text-xs text-zinc-500 uppercase">Data</text>
        <view class="bg-white dark:bg-zinc-900 ios:mx-4 ios:rounded-xl">
          <pressable
            class="px-4 py-3 active:bg-zinc-100 dark:active:bg-zinc-800"
            accessibilityRole="button"
            (press)="clearLocalData()"
          >
            <text class="text-rose-600">Clear local data</text>
          </pressable>
        </view>
      </scroll-view>
    </safe-area-view>
  `,
})
export class Settings {
  private readonly notes = inject(Notes);
  private readonly dialogs = inject(Dialogs);

  protected readonly syncEnabled = this.notes.syncEnabled;
  protected readonly pendingCount = this.notes.pendingCount;
  protected readonly lastSynced = computed(() => formatLastSynced(this.notes.lastSyncedAt()));

  protected setSyncEnabled(on: boolean): void {
    this.syncEnabled.set(on);
  }

  protected async clearLocalData(): Promise<void> {
    const sure = await this.dialogs.confirm('Clear local data?', {
      message: 'Every note on this device is deleted. Anything already synced stays on the server.',
      destructive: true,
    });
    if (!sure) return;
    await this.notes.clearLocalData();
  }
}
