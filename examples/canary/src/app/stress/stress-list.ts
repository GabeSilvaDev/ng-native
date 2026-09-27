import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import {
  Image,
  Pressable,
  Text,
  TextInput,
  View,
  VirtualList,
  VirtualListRow,
} from '@ng-native/components';
import { Engine } from '@ng-native/fabric';
import { NativeHeader } from '@ng-native/router';
import { FrameMonitor, stressRows, type StressRow } from './stress-rows.ts';

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * Ten thousand rows that size themselves, each with an image, twenty of them repriced ten times
 * a second, filtered as the user types, and a readout of what a run cost: JavaScript frames and
 * late ones, commits and slow ones, the worst commit and render, and nodes created and cloned.
 */
@Component({
  selector: 'x-stress-list',
  imports: [Image, NativeHeader, Pressable, Text, TextInput, View, VirtualList, VirtualListRow],
  template: `
    <native-header title="Stress list" />
    <view class="screen">
      <view class="toolbar">
        <text-input
          class="field grow"
          accessibilityLabel="Filter"
          placeholder="Filter"
          [(value)]="filter"
          autoCapitalize="none"
        />
        <pressable class="chip" accessibilityRole="button" (press)="toggleTicker()">
          <text class="chip-label">{{ ticking() ? 'Stop prices' : 'Live prices' }}</text>
        </pressable>
        <pressable class="chip" accessibilityRole="button" (press)="toggleMeasure()">
          <text class="chip-label">{{ measuring() ? 'Stop' : 'Measure' }}</text>
        </pressable>
      </view>
      <text class="hint readout" accessibilityRole="summary">{{ readout() }}</text>
      <virtual-list
        #list
        class="list"
        [items]="shown()"
        [estimatedItemHeight]="88"
        [keyExtractor]="idOf"
      >
        @for (row of list.window(); track row.slot) {
          <view [virtualListRow]="row" [nativeID]="'row-' + row.key" class="row">
            <image class="thumb" [source]="{ uri: row.item.image }" />
            <view class="grow">
              <view class="line">
                <text class="strong grow">{{ row.item.symbol }}</text>
                <text class="price">{{ priceOf(row.item) }}</text>
              </view>
              <text class="body">{{ row.item.name }}</text>
              <text class="hint">{{ row.item.note }}</text>
            </view>
          </view>
        }
      </virtual-list>
    </view>
  `,
  styles: `
    .toolbar {
      flex-direction: row;
      gap: 8px;
      padding: 8px 12px 4px;
      align-items: center;
    }
    .grow {
      flex: 1;
    }
    .chip {
      padding: 6px 10px;
      border-radius: 14px;
      background-color: var(--card);
    }
    .chip-label {
      color: var(--accent);
      font-size: 13px;
      font-weight: 600;
    }
    .readout {
      padding: 0 12px 6px;
    }
    .list {
      flex: 1;
    }
    .row {
      flex-direction: row;
      gap: 10px;
      padding: 10px 12px;
      border-bottom-width: 1px;
      border-bottom-color: var(--line);
    }
    .thumb {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      background-color: var(--card-inset);
    }
    .line {
      flex-direction: row;
    }
    .price {
      color: var(--accent);
      font-variant: tabular-nums;
    }
  `,
})
export class StressList {
  private readonly engine = inject(Engine);
  private readonly created = performance.now();

  protected readonly rows = stressRows();
  protected readonly filter = signal('');
  protected readonly shown = computed(() => {
    const query = this.filter().trim().toLowerCase();
    return query ? this.rows.filter((row) => row.name.includes(query)) : this.rows;
  });
  private readonly prices = signal<ReadonlyMap<string, number>>(new Map());
  protected readonly ticking = signal(false);
  protected readonly measuring = signal(false);
  protected readonly readout = signal('');
  protected readonly idOf = (row: StressRow) => row.id;

  private readonly monitor = new FrameMonitor();
  private ticker: ReturnType<typeof setInterval> | null = null;
  private started = { commits: 0, created: 0, cloned: 0, at: 0 };

  constructor() {
    afterNextRender(() => {
      this.readout.set(
        `${this.rows.length} rows, first render ${round(performance.now() - this.created)}ms`,
      );
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.ticker) clearInterval(this.ticker);
      this.monitor.stop();
    });
  }

  protected priceOf(row: StressRow): string {
    const price = this.prices().get(row.id) ?? 100 + (Number(row.id.slice(1)) % 900) / 10;
    return price.toFixed(2);
  }

  /** Twenty rows among the first few hundred repriced every 100ms, the ones on screen included. */
  protected toggleTicker(): void {
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
      this.ticking.set(false);
      return;
    }
    this.ticking.set(true);
    this.ticker = setInterval(() => {
      const next = new Map(this.prices());
      for (let i = 0; i < 20; i++) {
        const id = `s${Math.floor(Math.random() * 300)}`;
        next.set(id, 100 + Math.random() * 100);
      }
      this.prices.set(next);
    }, 100);
  }

  protected toggleMeasure(): void {
    const stats = this.engine.stats;
    if (!this.measuring()) {
      stats.worstCommitMs = 0;
      stats.worstRenderMs = 0;
      stats.slowCommits = 0;
      this.started = {
        commits: stats.commits,
        created: stats.createdNodes,
        cloned: stats.clonedNodes,
        at: performance.now(),
      };
      this.monitor.start();
      this.measuring.set(true);
      this.readout.set('Measuring: fling, filter, tick, then Stop');
      return;
    }
    const frames = this.monitor.stop();
    const seconds = (performance.now() - this.started.at) / 1000;
    this.measuring.set(false);
    this.readout.set(
      `${round(seconds)}s: ${frames.frames} JS frames, ${frames.late} late, worst gap ` +
        `${round(frames.worst)}ms. ${stats.commits - this.started.commits} commits, ` +
        `${stats.slowCommits} over 8ms, worst commit ${round(stats.worstCommitMs)}ms, worst render ` +
        `${round(stats.worstRenderMs)}ms, ${stats.createdNodes - this.started.created} created, ` +
        `${stats.clonedNodes - this.started.cloned} cloned`,
    );
    // The same numbers where a script can read them from the device log.
    console.error(`[stress] ${this.readout()}`);
  }
}
