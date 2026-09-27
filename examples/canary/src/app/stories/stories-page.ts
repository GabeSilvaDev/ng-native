import { Component, inject } from '@angular/core';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { STORIES, Viewer } from './stories-model.ts';

/** A tray of stories: a ring on each that dims once all of it has been seen. */
@Component({
  selector: 'x-stories',
  imports: [NativeHeader, Pressable, ScrollView, Text, View],
  template: `
    <native-header title="Stories" [largeTitle]="true" />
    <scroll-view class="page" contentInsetAdjustmentBehavior="automatic">
      <scroll-view
        class="tray"
        [horizontal]="true"
        [showsHorizontalScrollIndicator]="false"
        [contentContainerStyle]="trayContent"
      >
        @for (story of stories; track story.id; let i = $index) {
          <pressable
            class="person"
            [class.seen]="viewer.seen().has(story.id)"
            accessibilityRole="button"
            [accessibilityLabel]="story.name + (viewer.seen().has(story.id) ? ', seen' : ', new')"
            (press)="watch(i)"
          >
            <view class="ring"
              ><view class="gap"
                ><view
                  class="avatar"
                  [style.--from]="story.slides[0].from"
                  [style.--to]="story.slides[0].to"
                  ><text class="initial">{{ story.initial }}</text></view
                ></view
              ></view
            >
            <text class="name">{{ story.name }}</text>
          </pressable>
        }
      </scroll-view>
      <text class="hint"
        >Tap a story. Hold to pause, tap either side to step, swipe down to close.</text
      >
    </scroll-view>
  `,
  styles: `
    .page {
      flex: 1;
      background-color: light-dark(white, black);
    }
    .tray {
      flex-grow: 0;
      margin-top: 8px;
    }
    .person {
      align-items: center;
      margin-right: 14px;
      gap: 6px;
    }
    .ring {
      padding: 3px;
      border-radius: 40px;
      background-image: linear-gradient(45deg, #f9ce34, #ee2a7b 55%, #6228d7);
    }
    .seen .ring {
      background-image: linear-gradient(
        45deg,
        light-dark(#d4d4d8, #3f3f46),
        light-dark(#d4d4d8, #3f3f46)
      );
    }
    .gap {
      padding: 3px;
      border-radius: 37px;
      background-color: light-dark(white, black);
    }
    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 32px;
      align-items: center;
      justify-content: center;
      background-image: linear-gradient(160deg, var(--from), var(--to));
    }
    .initial {
      color: white;
      font-size: 26px;
      font-weight: 800;
    }
    .name {
      color: light-dark(black, white);
      font-size: 12px;
    }
    .hint {
      margin: 24px 20px;
      color: light-dark(oklch(0.5 0 0), oklch(0.7 0 0));
      font-size: 14px;
      line-height: 20px;
    }
  `,
})
export class StoriesPage {
  protected readonly viewer = inject(Viewer);
  private readonly nav = inject(NativeNavigation);
  protected readonly stories = STORIES;
  protected readonly trayContent = { paddingHorizontal: 16 };

  protected watch(story: number): void {
    this.viewer.open(story);
    void this.nav.present('/stories/view', { as: 'fullScreenModal' });
  }
}
