import { Component, computed, inject, signal } from '@angular/core';
import { Gesture } from 'react-native-gesture-handler';
import { Pressable, Text, TextInput, View } from '@ng-native/components';
import { GestureRoot, NativeGesture } from '@ng-native/components/gestures';
import { NativeNavigation } from '@ng-native/router';
import { Viewer } from './stories-model.ts';

/** How long a slide shows, in milliseconds. */
export const SLIDE_MS = 5000;

/**
 * The story viewer. Each slide's progress bar is a keyframe animation, and the slide moves on
 * when it ends (`animationend`). Holding a finger down pauses it with `animation-play-state`;
 * a tap on either side steps; a swipe down closes, following the finger first.
 */
@Component({
  selector: 'x-story-viewer',
  imports: [GestureRoot, NativeGesture, Pressable, Text, TextInput, View],
  template: `
    <gesture-root>
      <view
        class="viewer"
        [class.dragging]="drag() > 0"
        [style.transform]="'translateY(' + drag() + 'px)'"
        [style.--from]="viewer.slide().from"
        [style.--to]="viewer.slide().to"
        [gesture]="swipe"
      >
        <view class="slide" [accessibilityLabel]="viewer.slide().caption" [accessible]="true">
          <text class="glyph">{{ viewer.slide().glyph }}</text>
          <text class="caption">{{ viewer.slide().caption }}</text>
        </view>

        <view class="top">
          <view class="bars" [class.held]="held()">
            @for (one of viewer.story().slides; track one.id; let i = $index) {
              <view class="bar">
                <view
                  [class]="
                    i < viewer.place().slide
                      ? 'fill done'
                      : i === viewer.place().slide
                        ? 'fill running'
                        : 'fill'
                  "
                  (animationend)="advance()"
                ></view>
              </view>
            }
          </view>
          <view class="who">
            <view class="avatar"
              ><text class="initial">{{ viewer.story().initial }}</text></view
            >
            <text class="name">{{ viewer.story().name }}</text>
            <text class="when">{{ held() ? 'Paused' : '2h' }}</text>
            <pressable
              class="close"
              accessibilityRole="button"
              accessibilityLabel="Close"
              (press)="close()"
            >
              <text class="close-glyph">✕</text>
            </pressable>
          </view>
        </view>

        <pressable
          class="zone back"
          accessibilityRole="button"
          accessibilityLabel="Previous"
          (pressIn)="held.set(true)"
          (pressOut)="held.set(false)"
          (longPress)="(0)"
          (press)="viewer.previous()"
        ></pressable>
        <pressable
          class="zone forward"
          accessibilityRole="button"
          accessibilityLabel="Next"
          (pressIn)="held.set(true)"
          (pressOut)="held.set(false)"
          (longPress)="(0)"
          (press)="advance()"
        ></pressable>

        <view class="reply">
          <text-input
            class="reply-field"
            placeholder="Send message"
            placeholderTextColor="rgba(255,255,255,0.7)"
            accessibilityLabel="Send message"
          />
        </view>
      </view>
    </gesture-root>
  `,
  styles: `
    .viewer {
      flex: 1;
      background-image: linear-gradient(170deg, var(--from), var(--to));
      transition:
        transform 220ms ease-out,
        border-radius 220ms ease-out;
    }
    .dragging {
      border-radius: 28px;
      transition: none;
    }
    .slide {
      flex: 1;
      align-items: center;
      justify-content: center;
      gap: 18px;
      padding: 40px;
    }
    .glyph {
      font-size: 120px;
      padding: 20px;
      text-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
      animation: drift 5s ease-out both;
    }
    @keyframes drift {
      from {
        scale: 0.85;
        opacity: 0;
      }
      to {
        scale: 1.05;
      }
    }
    .caption {
      color: white;
      font-size: 28px;
      font-weight: 800;
      text-align: center;
      letter-spacing: -0.4px;
      text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
    }
    .top {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      padding: calc(env(safe-area-inset-top) + 6px) 10px 0;
      gap: 12px;
      background-image: linear-gradient(180deg, rgba(0, 0, 0, 0.35), transparent);
    }
    .bars {
      flex-direction: row;
      gap: 4px;
    }
    .bar {
      flex: 1;
      height: 3px;
      border-radius: 2px;
      overflow: hidden;
      background-color: rgba(255, 255, 255, 0.35);
    }
    .fill {
      flex: 1;
      background-color: white;
      transform-origin: left;
      scale: 0 1;
    }
    .done {
      scale: 1 1;
    }
    .running {
      animation: progress 5s linear forwards;
    }
    .held .running {
      animation-play-state: paused;
    }
    @keyframes progress {
      from {
        scale: 0 1;
      }
      to {
        scale: 1 1;
      }
    }
    .who {
      flex-direction: row;
      align-items: center;
      gap: 10px;
      padding: 0 4px;
    }
    .avatar {
      width: 34px;
      height: 34px;
      border-radius: 17px;
      align-items: center;
      justify-content: center;
      border-width: 1.5px;
      border-color: white;
      background-color: rgba(255, 255, 255, 0.2);
    }
    .initial {
      color: white;
      font-size: 15px;
      font-weight: 800;
    }
    .name {
      color: white;
      font-size: 15px;
      font-weight: 700;
    }
    .when {
      flex: 1;
      color: rgba(255, 255, 255, 0.75);
      font-size: 14px;
    }
    .close {
      padding: 8px;
    }
    .close-glyph {
      color: white;
      font-size: 20px;
      font-weight: 600;
    }
    .zone {
      position: absolute;
      top: 120px;
      bottom: 110px;
    }
    .back {
      left: 0;
      width: 35%;
    }
    .forward {
      right: 0;
      width: 65%;
    }
    .reply {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      padding: 10px 14px calc(env(safe-area-inset-bottom) + 10px);
    }
    .reply-field {
      height: 44px;
      padding: 0 18px;
      border-radius: 22px;
      border-width: 1px;
      border-color: rgba(255, 255, 255, 0.6);
      color: white;
      font-size: 16px;
    }
  `,
})
export class StoryViewer {
  protected readonly viewer = inject(Viewer);
  private readonly nav = inject(NativeNavigation);
  protected readonly held = signal(false);
  /** How far the viewer has been pulled down. */
  protected readonly drag = signal(0);
  protected readonly swipe;

  constructor() {
    // Read through locals: a gesture callback is rewritten into a worklet, which has no `this`.
    const drag = this.drag;
    const close = () => this.close();
    this.swipe = Gesture.Pan()
      .runOnJS(true)
      .activeOffsetY(14)
      .failOffsetX([-20, 20])
      .onUpdate((event) => drag.set(Math.max(0, event.translationY)))
      .onEnd((event) => {
        if (event.translationY > 140 || event.velocityY > 900) close();
        else drag.set(0);
      });
  }

  protected advance(): void {
    if (!this.viewer.next()) this.close();
  }

  protected close(): void {
    this.drag.set(0);
    this.nav.back();
  }
}
