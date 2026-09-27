import { Component, type OnInit, computed, inject, input, signal } from '@angular/core';
import {
  Pressable,
  RefreshControl,
  Text,
  View,
  VirtualList,
  VirtualListRow,
} from '@ng-native/components';
import { NativeHeader, NativeHeaderItem, NativeNavigation } from '@ng-native/router';
import { ProjectStore, type Task } from './project-data.ts';

type Filter = 'all' | 'open' | 'done';

/** One project's tasks, filtered, with a way to add one. */
@Component({
  selector: 'x-project',
  imports: [
    NativeHeader,
    NativeHeaderItem,
    Pressable,
    RefreshControl,
    Text,
    View,
    VirtualList,
    VirtualListRow,
  ],
  template: `
    <native-header [title]="store.project(pid())?.name ?? 'Project'">
      <native-header-item type="right">
        <pressable accessibilityRole="button" accessibilityLabel="New task" (press)="create()">
          <text class="action">New</text>
        </pressable>
      </native-header-item>
    </native-header>
    <view class="screen">
      @if (store.notice(); as notice) {
        <pressable class="card notice" accessibilityRole="alert" (press)="store.dismissNotice()">
          <text class="body danger">{{ notice }}</text>
        </pressable>
      }
      <view class="filters">
        @for (option of filters; track option) {
          <pressable
            [class]="filter() === option ? 'chip chip-on' : 'chip'"
            accessibilityRole="button"
            [accessibilityState]="{ selected: filter() === option }"
            (press)="filter.set(option)"
          >
            <text class="chip-label">{{ option }}</text>
          </pressable>
        }
        <text class="hint count">{{ shown().length }} tasks</text>
      </view>
      <virtual-list #list class="list" [items]="shown()" [itemHeight]="56" [keyExtractor]="idOf">
        <refresh-control [refreshing]="store.state() === 'refreshing'" (refresh)="store.load()" />
        @for (row of list.window(); track row.slot) {
          <view [virtualListRow]="row">
            <view class="task">
              <pressable
                class="check"
                accessibilityRole="checkbox"
                [accessibilityLabel]="row.item.title"
                [accessibilityState]="{ checked: row.item.done }"
                (press)="store.toggleDone(row.item.id)"
              >
                <text [class]="row.item.done ? 'tick on' : 'tick'">{{
                  row.item.done ? '✓' : ''
                }}</text>
              </pressable>
              <pressable class="task-title" accessibilityRole="button" (press)="open(row.item)">
                <text [class]="row.item.done ? 'body done' : 'body'">{{ row.item.title }}</text>
              </pressable>
            </view>
          </view>
        }
      </virtual-list>
    </view>
  `,
  styles: `
    .action {
      color: var(--accent);
      font-size: 17px;
      font-weight: 600;
    }
    .filters {
      flex-direction: row;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
    }
    .chip {
      padding: 6px 12px;
      border-radius: 14px;
      background-color: var(--card);
    }
    .chip-on {
      background-color: var(--accent);
    }
    .chip-label {
      color: var(--text-strong);
      font-size: 13px;
    }
    .chip-on .chip-label {
      color: rgb(255, 255, 255);
    }
    .count {
      margin-left: auto;
    }
    .list {
      flex: 1;
    }
    .task {
      height: 56px;
      flex-direction: row;
      align-items: center;
      gap: 12px;
      padding: 0 16px;
      border-bottom-width: 1px;
      border-bottom-color: var(--line);
      background-color: var(--card);
    }
    .check {
      width: 28px;
      height: 28px;
      border-radius: 14px;
      border-width: 2px;
      border-color: var(--line);
      align-items: center;
      justify-content: center;
    }
    .tick {
      color: var(--accent);
      font-weight: 700;
    }
    .task-title {
      flex: 1;
      padding: 16px 0;
    }
    .done {
      color: var(--text-muted);
      text-decoration-line: line-through;
    }
  `,
})
export class ProjectPage implements OnInit {
  readonly pid = input.required<string>();
  protected readonly store = inject(ProjectStore);

  ngOnInit(): void {
    this.store.ensureLoaded();
  }
  private readonly nav = inject(NativeNavigation);

  protected readonly filters: Filter[] = ['all', 'open', 'done'];
  protected readonly filter = signal<Filter>('all');
  protected readonly idOf = (task: Task): string => task.id;
  protected readonly shown = computed(() => {
    const tasks = this.store.tasksOf(this.pid());
    const filter = this.filter();
    return filter === 'all' ? tasks : tasks.filter((task) => task.done === (filter === 'done'));
  });

  protected open(task: Task): void {
    void this.nav.push(['/projects', this.pid(), 'tasks', task.id]);
  }

  protected create(): void {
    void this.nav.present(['/projects', this.pid(), 'new'], {
      as: 'formSheet',
      presentation: { sheetAllowedDetents: [0.6, 1], sheetGrabberVisible: true },
    });
  }
}
