import { Component, computed, input, output } from '@angular/core';
import { Image, Pressable, Text, View } from '@ng-native/components';
import type { ChatMessage } from './chat-backend.ts';

/** One message: a bubble on Sam's side or mine, with a picture and a delivery state. */
@Component({
  selector: 'x-chat-bubble',
  imports: [Image, Pressable, Text, View],
  template: `
    <view [class]="mine() ? 'line mine' : 'line'">
      <view [class]="mine() ? 'bubble out' : 'bubble in'">
        @if (message().image; as image) {
          <image
            class="picture"
            [source]="{ uri: image.uri }"
            [style]="{ aspectRatio: image.aspect }"
            resizeMode="cover"
            accessibilityRole="image"
            accessibilityLabel="Photo"
          />
        }
        <text [class]="mine() ? 'words words-out' : 'words'">{{ message().text }}</text>
      </view>
      @switch (message().state) {
        @case ('sending') {
          <text class="state">Sending</text>
        }
        @case ('failed') {
          <pressable
            accessibilityRole="button"
            [accessibilityLabel]="'Not delivered. Retry sending ' + message().text"
            (press)="retry.emit()"
          >
            <text class="state danger">Not delivered. Tap to retry</text>
          </pressable>
        }
      }
    </view>
  `,
  styles: `
    .line {
      padding: 3px 12px;
      align-items: flex-start;
    }
    .mine {
      align-items: flex-end;
    }
    .bubble {
      max-width: 78%;
      border-radius: 18px;
      padding: 8px 12px;
      gap: 6px;
    }
    .in {
      background-color: var(--card);
    }
    .out {
      background-color: var(--accent);
    }
    .picture {
      width: 220px;
      border-radius: 12px;
      background-color: var(--card-inset);
    }
    .words {
      color: var(--text-strong);
      font-size: 16px;
    }
    .words-out {
      color: rgb(255, 255, 255);
    }
    .state {
      color: var(--text-muted);
      font-size: 12px;
      padding: 2px 4px;
    }
  `,
})
export class ChatBubble {
  readonly message = input.required<ChatMessage>();
  readonly retry = output<void>();
  protected readonly mine = computed(() => this.message().from === 'me');
}
