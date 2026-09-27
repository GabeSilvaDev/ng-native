import { Component, type OnInit, computed, inject, input } from '@angular/core';
import { Pressable, ScrollView, Text } from '@ng-native/components';
import { NativeHeader, NativeNavigation, NativeRouterLink } from '@ng-native/router';
import { PEOPLE, ProjectStore } from './project-data.ts';

/** A person, and the open tasks they have, each of which leads deeper still. */
@Component({
  selector: 'x-person',
  imports: [NativeHeader, NativeRouterLink, Pressable, ScrollView, Text],
  template: `
    <native-header [title]="person()?.name ?? 'Person'" />
    <scroll-view class="screen" [contentContainerStyle]="content">
      <text class="hint">{{ person()?.role }}</text>
      @for (task of openTasks(); track task.id) {
        <pressable
          class="card"
          accessibilityRole="link"
          [nativeRouterLink]="['/projects', task.projectId, 'tasks', task.id]"
        >
          <text class="body">{{ task.title }}</text>
        </pressable>
      }
      <pressable class="button" accessibilityRole="button" (press)="nav.popToRoot()">
        <text class="button-label">Back to the start</text>
      </pressable>
    </scroll-view>
  `,
})
export class PersonPage implements OnInit {
  readonly uid = input.required<string>();
  private readonly store = inject(ProjectStore);

  ngOnInit(): void {
    this.store.ensureLoaded();
  }
  protected readonly nav = inject(NativeNavigation);
  protected readonly content = { padding: 20, gap: 10 };
  protected readonly person = computed(() => PEOPLE.find((person) => person.id === this.uid()));
  protected readonly openTasks = computed(() =>
    [...this.store.tasks().values()]
      .filter((task) => task.assignee === this.uid() && !task.done)
      .slice(0, 8),
  );
}
