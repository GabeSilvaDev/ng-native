import { Component, type OnInit, inject } from '@angular/core';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from '@ng-native/components';
import { NativeHeader, NativeRouterLink } from '@ng-native/router';
import { ProjectStore } from './project-data.ts';

/** Every project, with how much is left in each. The root of the task manager. */
@Component({
  selector: 'x-projects',
  imports: [
    ActivityIndicator,
    NativeHeader,
    NativeRouterLink,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
  ],
  template: `
    <native-header title="Projects" [largeTitle]="true" />
    <scroll-view
      class="screen"
      contentInsetAdjustmentBehavior="automatic"
      [contentContainerStyle]="content"
    >
      <refresh-control [refreshing]="store.state() === 'refreshing'" (refresh)="store.load()" />
      @switch (store.state()) {
        @case ('loading') {
          <activity-indicator size="large" />
        }
        @case ('failed') {
          <text class="body danger" accessibilityRole="alert">Could not load the projects.</text>
          <pressable class="button" accessibilityRole="button" (press)="store.load()">
            <text class="button-label">Try again</text>
          </pressable>
        }
      }
      @for (project of store.projects(); track project.id) {
        <pressable
          class="card project"
          accessibilityRole="button"
          [nativeRouterLink]="['/projects', project.id]"
        >
          <text class="button-label">{{ project.name }}</text>
          <text class="hint">{{ open(project.id) }} open</text>
        </pressable>
      }
    </scroll-view>
  `,
  styles: `
    .project {
      flex-direction: row;
      justify-content: space-between;
    }
  `,
})
export class ProjectsPage implements OnInit {
  protected readonly store = inject(ProjectStore);
  protected readonly content = { padding: 16, gap: 10 };

  ngOnInit(): void {
    if (!this.store.loaded()) void this.store.load();
  }

  protected open(projectId: string): number {
    return this.store.tasksOf(projectId).filter((task) => !task.done).length;
  }
}
