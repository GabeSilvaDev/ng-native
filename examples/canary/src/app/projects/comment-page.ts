import { Component, type OnInit, computed, inject, input } from '@angular/core';
import { Pressable, ScrollView, Text } from '@ng-native/components';
import { NativeHeader, NativeRouterLink } from '@ng-native/router';
import { PEOPLE, ProjectStore } from './project-data.ts';

/** One comment on a task, and who wrote it. */
@Component({
  selector: 'x-comment',
  imports: [NativeHeader, NativeRouterLink, Pressable, ScrollView, Text],
  template: `
    <native-header title="Comment" />
    <scroll-view class="screen" [contentContainerStyle]="content">
      <text class="body">{{ comment()?.text ?? 'This comment has gone.' }}</text>
      @if (author(); as author) {
        <pressable
          class="card"
          accessibilityRole="link"
          [nativeRouterLink]="['/people', author.id]"
        >
          <text class="button-label">{{ author.name }}</text>
          <text class="hint">{{ author.role }}</text>
        </pressable>
      }
    </scroll-view>
  `,
})
export class CommentPage implements OnInit {
  readonly cid = input.required<string>();
  private readonly store = inject(ProjectStore);

  ngOnInit(): void {
    this.store.ensureLoaded();
  }
  protected readonly content = { padding: 20, gap: 12 };
  protected readonly comment = computed(() => this.store.comment(this.cid()));
  protected readonly author = computed(() =>
    PEOPLE.find((person) => person.id === this.comment()?.author),
  );
}
