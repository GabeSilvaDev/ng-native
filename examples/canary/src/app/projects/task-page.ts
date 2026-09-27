import { Component, type OnInit, computed, inject, input } from '@angular/core';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { Dialogs } from '@ng-native/device';
import { NativeHeader, NativeNavigation, NativeRouterLink } from '@ng-native/router';
import { PEOPLE, ProjectServer, ProjectStore } from './project-data.ts';

/**
 * One task: what it is, who has it, what people said, and what can be done to it. Reached from a
 * project, a person, or a deep link, and always showing the store's copy, so a change made
 * anywhere else is here when the user comes back.
 */
@Component({
  selector: 'x-task',
  imports: [NativeHeader, NativeRouterLink, Pressable, ScrollView, Text, View],
  template: `
    <native-header [title]="task()?.title ?? 'Task'" />
    <scroll-view class="screen" [contentContainerStyle]="content">
      @if (store.notice(); as notice) {
        <pressable class="card notice" accessibilityRole="alert" (press)="store.dismissNotice()">
          <text class="body danger">{{ notice }}</text>
        </pressable>
      }
      @if (task(); as task) {
        <text class="heading">{{ task.title }}</text>
        @if (task.notes) {
          <text class="body">{{ task.notes }}</text>
        }
        <pressable
          class="card row"
          accessibilityRole="checkbox"
          [accessibilityState]="{ checked: task.done }"
          (press)="store.toggleDone(task.id)"
        >
          <text class="body">{{ task.done ? 'Done' : 'Not done' }}</text>
          <text class="hint">Tap to change</text>
        </pressable>
        <pressable
          class="card row"
          accessibilityRole="link"
          [nativeRouterLink]="['/people', task.assignee]"
        >
          <text class="body">Assigned to</text>
          <text class="strong">{{ assignee() }}</text>
        </pressable>

        <view class="actions">
          <pressable class="button" accessibilityRole="button" (press)="edit()">
            <text class="button-label">Edit</text>
          </pressable>
          <pressable class="card" accessibilityRole="button" (press)="duplicate()">
            <text class="button-label">Duplicate</text>
          </pressable>
          <pressable class="card" accessibilityRole="button" (press)="remove()">
            <text class="button-label danger">Delete</text>
          </pressable>
        </view>

        <text class="section">Comments</text>
        @for (comment of comments(); track comment.id) {
          <pressable
            class="card comment"
            accessibilityRole="link"
            [nativeRouterLink]="['/projects', pid(), 'tasks', tid(), 'comments', comment.id]"
          >
            <text class="body">{{ comment.text }}</text>
          </pressable>
        }

        <text class="section">Elsewhere</text>
        <pressable class="card" accessibilityRole="button" (press)="editedElsewhere()">
          <text class="button-label">Have Grace rename it, then refresh</text>
        </pressable>
        <pressable
          class="card"
          accessibilityRole="button"
          (press)="nav.popTo(['/projects', pid()])"
        >
          <text class="button-label">Back to the project</text>
        </pressable>
        <pressable class="card" accessibilityRole="button" (press)="nav.popTo('/projects')">
          <text class="button-label">Back to all projects</text>
        </pressable>
      } @else if (!store.loaded()) {
        <text class="hint">Loading</text>
      } @else {
        <text class="body" accessibilityRole="alert">This task has been deleted.</text>
        <pressable class="button" accessibilityRole="button" (press)="nav.back()">
          <text class="button-label">Go back</text>
        </pressable>
      }
    </scroll-view>
  `,
  styles: `
    .row {
      flex-direction: row;
      justify-content: space-between;
    }
    .actions {
      flex-direction: row;
      gap: 10px;
    }
    .comment {
      align-items: flex-start;
    }
    .section {
      color: var(--text-strong);
      font-size: 18px;
      font-weight: 700;
      margin-top: 8px;
    }
  `,
})
export class TaskPage implements OnInit {
  readonly pid = input.required<string>();
  readonly tid = input.required<string>();
  protected readonly store = inject(ProjectStore);

  ngOnInit(): void {
    this.store.ensureLoaded();
  }
  protected readonly nav = inject(NativeNavigation);
  private readonly server = inject(ProjectServer);
  private readonly dialogs = inject(Dialogs);

  protected readonly content = { padding: 20, gap: 12 };
  protected readonly task = computed(() => this.store.task(this.tid()));
  protected readonly comments = computed(() => this.store.commentsOf(this.tid()));
  protected readonly assignee = computed(
    () => PEOPLE.find((person) => person.id === this.task()?.assignee)?.name ?? 'nobody',
  );

  protected edit(): void {
    void this.nav.present(['/projects', this.pid(), 'tasks', this.tid(), 'edit'], {
      as: 'formSheet',
      presentation: { sheetAllowedDetents: [0.6, 1], sheetGrabberVisible: true },
    });
  }

  protected duplicate(): void {
    const copy = this.store.duplicate(this.tid());
    if (copy) void this.nav.push(['/projects', this.pid(), 'tasks', copy.id]);
  }

  protected async remove(): Promise<void> {
    const sure = await this.dialogs.confirm('Delete this task?', {
      message: 'It goes for everyone on the project.',
      confirm: 'Delete',
      destructive: true,
    });
    if (!sure) return;
    void this.store.remove(this.tid());
    this.nav.back();
  }

  protected editedElsewhere(): void {
    this.server.editElsewhere(this.tid());
    void this.store.load();
  }
}
