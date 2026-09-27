import { Component, inject, signal } from '@angular/core';
import { ScrollView, Text, View, VirtualList } from '@ng-native/components';
import { NativeHeader } from '@ng-native/router';
import { Engine } from '@ng-native/fabric';
import { page } from '../screen-styles.ts';

interface Row {
  kind: 'header' | 'item';
  label: string;
}

@Component({
  selector: 'x-list',
  imports: [NativeHeader, ScrollView, VirtualList, Text, View],
  template: `
    <native-header title="Virtual list" />
    <scroll-view class="screen" [contentContainerStyle]="page.content">
      <text class="hint">
        1000 rows, headers taller than items. Fling it, then read the numbers.
      </text>
      <text class="body">
        mount <text class="strong">{{ mount() }}ms</text>, worst commit
        <text class="strong">{{ worst() }}ms</text>, slow <text class="strong">{{ slow() }}</text
        >/<text class="strong">{{ commits() }}</text>
      </text>

      <virtual-list #list [items]="rows" [itemHeight]="rowHeight" class="list" (scroll)="sample()">
        @for (row of list.window(); track row.slot) {
          <view [style]="row.style">
            <text [class]="row.item.kind === 'header' ? 'list-header' : 'list-item'">{{
              row.item.label
            }}</text>
          </view>
        }
      </virtual-list>
    </scroll-view>
  `,
  styles: `
    .list {
      height: 320px;
      background-color: var(--card-inset);
      border-radius: 8px;
    }

    .list-item {
      color: var(--text);
      font-size: 15px;
      padding: 10px 12px;
    }

    .list-header {
      color: var(--text-strong);
      font-size: 15px;
      font-weight: 700;
      background-color: var(--card);
      padding: 14px 12px;
    }
  `,
})
export class ListPage {
  protected readonly page = page;
  private readonly engine = inject(Engine);

  protected readonly rows: Row[] = Array.from({ length: 100 }, (_, section) => [
    { kind: 'header' as const, label: `section ${section}` },
    ...Array.from({ length: 9 }, (_, i) => ({
      kind: 'item' as const,
      label: `item ${section}.${i}`,
    })),
  ]).flat();

  protected readonly rowHeight = (row: Row): number => (row.kind === 'header' ? 52 : 40);
  protected readonly mount = signal(0);
  protected readonly worst = signal(0);
  protected readonly slow = signal(0);
  protected readonly commits = signal(0);

  private lastSample = 0;

  /** Publish rarely: writing signals on every scroll callback is a change-detection pass a frame. */
  protected sample(): void {
    const now = Date.now();
    if (now - this.lastSample < 400) return;
    this.lastSample = now;
    const stats = this.engine.stats;
    const round = (n: number) => Math.round(n * 10) / 10;
    this.mount.set(round(stats.firstCommitMs));
    this.worst.set(round(stats.worstCommitMs));
    this.slow.set(stats.slowCommits);
    this.commits.set(stats.commits);
  }
}
