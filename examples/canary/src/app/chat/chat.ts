import { Component, type OnInit, computed, inject, signal, viewChild } from '@angular/core';
import {
  ActivityIndicator,
  KeyboardDock,
  KeyboardLift,
  Pressable,
  Text,
  TextInput,
  View,
  VirtualList,
  VirtualListRow,
  type VirtualListVisiblePosition,
} from '@ng-native/components';
import type { NativeSyntheticEvent } from '@ng-native/fabric';
import { NativeHeader } from '@ng-native/router';
import { Palette } from '../palette.ts';
import { ChatBackend, type ChatMessage } from './chat-backend.ts';
import { ChatBubble } from './chat-bubble.ts';
import { ChatStore } from './chat-store.ts';

/** How far from the newest message, in points, before a message arriving waits behind a button. */
const AWAY = 80;

/**
 * A conversation, as a messaging app's thread is: a long history drawn bottom up, older messages
 * loading above as the user scrolls back, a composer that grows and rides the keyboard (a
 * `<keyboard-dock>` the transcript rises with, an interactive dismissal included), messages
 * that send, fail and retry, and replies that arrive while the user reads.
 */
@Component({
  selector: 'x-chat',
  imports: [
    ActivityIndicator,
    ChatBubble,
    KeyboardDock,
    KeyboardLift,
    NativeHeader,
    Pressable,
    Text,
    TextInput,
    View,
    VirtualList,
    VirtualListRow,
  ],
  providers: [ChatStore],
  template: `
    <native-header title="Sam" />
    <view class="screen">
      <view class="toolbar">
        <pressable class="chip" accessibilityRole="button" (press)="store.receive()">
          <text class="chip-label">Sam replies</text>
        </pressable>
        <pressable
          class="chip"
          accessibilityRole="switch"
          [accessibilityState]="{ checked: live() }"
          (press)="toggleLive()"
        >
          <text class="chip-label">{{ live() ? 'Live: on' : 'Live: off' }}</text>
        </pressable>
        <pressable
          class="chip"
          accessibilityRole="switch"
          [accessibilityState]="{ checked: offline() }"
          (press)="toggleOffline()"
        >
          <text class="chip-label">{{ offline() ? 'Offline' : 'Online' }}</text>
        </pressable>
      </view>

      <!-- The transcript rises with the composer as the keyboard does, clipped at the top. -->
      <view class="transcript-frame">
        <view class="transcript" [keyboardLift]="dock">
          <virtual-list
            #transcript
            class="transcript"
            [inverted]="true"
            [items]="store.messages()"
            [estimatedItemHeight]="estimate"
            [keyExtractor]="idOf"
            [itemType]="kindOf"
            [maintainVisibleContentPosition]="hold"
            keyboardDismissMode="interactive"
            (endReached)="store.loadOlder()"
            (scroll)="onScroll($event)"
          >
            <view listHeader class="typing-slot">
              @if (store.typing()) {
                <text class="hint typing" accessibilityLiveRegion="polite">Sam is typing</text>
              }
            </view>
            @for (row of transcript.window(); track row.slot) {
              <view [virtualListRow]="row">
                <x-chat-bubble [message]="row.item" (retry)="store.retry(row.item.id)" />
              </view>
            }
            <view listFooter class="history-edge">
              @if (store.reachedStart()) {
                <text class="hint">This is the start of your conversation with Sam.</text>
              } @else {
                <activity-indicator />
              }
            </view>
          </virtual-list>
        </view>
      </view>

      @if (away()) {
        <pressable
          class="jump"
          accessibilityRole="button"
          [accessibilityLabel]="unseen() ? unseen() + ' new messages' : 'Latest messages'"
          (press)="jumpToLatest()"
        >
          <text class="jump-label">{{ unseen() ? unseen() + ' new' : 'Latest' }}</text>
        </pressable>
      }

      <keyboard-dock #dock [backgroundColor]="palette.current().screen">
        <view class="composer">
          <text-input
            #field
            class="field compose-field"
            [multiline]="true"
            [(value)]="draft"
            placeholder="Message"
            placeholderTextColor="#6c6c78"
            accessibilityLabel="Message"
          />
          <pressable
            class="send"
            accessibilityRole="button"
            accessibilityLabel="Send"
            [disabled]="!canSend()"
            [accessibilityState]="{ disabled: !canSend() }"
            (press)="send()"
          >
            <text [class]="canSend() ? 'send-label' : 'send-label idle'">Send</text>
          </pressable>
        </view>
      </keyboard-dock>
    </view>
  `,
  styles: `
    .toolbar {
      flex-direction: row;
      gap: 8px;
      padding: 8px 12px;
    }
    .chip {
      padding: 6px 12px;
      border-radius: 14px;
      background-color: var(--card);
    }
    .chip-label {
      color: var(--accent);
      font-size: 13px;
      font-weight: 600;
    }
    .transcript-frame {
      flex: 1;
      overflow: hidden;
    }
    .transcript {
      flex: 1;
    }
    .typing-slot {
      min-height: 8px;
    }
    .typing {
      padding: 6px 16px;
    }
    .history-edge {
      padding: 16px;
      align-items: center;
    }
    .jump {
      position: absolute;
      right: 16px;
      bottom: 88px;
      padding: 8px 14px;
      border-radius: 18px;
      background-color: var(--accent);
    }
    .jump-label {
      color: rgb(255, 255, 255);
      font-weight: 700;
    }
    .composer {
      flex-direction: row;
      align-items: flex-end;
      gap: 8px;
      padding: 8px 12px;
      padding-bottom: 8px;
      border-top-width: 1px;
      border-top-color: var(--line);
      background-color: var(--screen);
    }
    .compose-field {
      flex: 1;
      max-height: 120px;
      font-size: 16px;
      padding-top: 9px;
      padding-bottom: 9px;
      background-color: var(--card);
    }
    .send {
      padding: 10px 6px;
    }
    .send-label {
      color: var(--accent);
      font-size: 16px;
      font-weight: 700;
    }
    .idle {
      color: var(--text-muted);
    }
  `,
})
export class ChatPage implements OnInit {
  protected readonly store = inject(ChatStore);
  protected readonly palette = inject(Palette);
  private readonly backend = inject(ChatBackend);
  private readonly transcript = viewChild.required<VirtualList<ChatMessage>>('transcript');

  protected readonly hold: VirtualListVisiblePosition = {
    minIndexForVisible: 0,
    autoscrollToTopThreshold: AWAY,
  };
  protected readonly idOf = (message: ChatMessage): string => message.id;
  protected readonly kindOf = (message: ChatMessage): string =>
    message.image ? 'picture' : message.state === 'failed' ? 'failed' : 'text';
  protected readonly estimate = (message: ChatMessage): number =>
    46 + Math.ceil(message.text.length / 30) * 21 + (message.image ? 190 : 0);

  protected readonly draft = signal('');
  protected readonly canSend = computed(() => this.draft().trim().length > 0);
  protected readonly live = signal(false);
  protected readonly offline = signal(false);
  /** Whether the user has scrolled back from the newest message; written only when it changes. */
  protected readonly away = signal(false);
  /** The newest message when the user scrolled away from it, which is where new ones start. */
  private readonly newestWhenAway = signal<string | null>(null);
  /** Messages that arrived while away: everything now in front of that one. */
  protected readonly unseen = computed(() => {
    const mark = this.newestWhenAway();
    if (!mark) return 0;
    return Math.max(
      0,
      this.store.messages().findIndex((message) => message.id === mark),
    );
  });

  ngOnInit(): void {
    void this.store.loadOlder();
  }

  protected send(): void {
    this.store.send(this.draft());
    this.draft.set('');
    this.transcript().scrollToOffset({ offset: 0, animated: true });
  }

  protected onScroll(event: NativeSyntheticEvent<{ contentOffset?: { y?: number } }>): void {
    const away = (event.nativeEvent?.contentOffset?.y ?? 0) > AWAY;
    if (away === this.away()) return;
    this.away.set(away);
    this.newestWhenAway.set(away ? (this.store.messages()[0]?.id ?? null) : null);
  }

  protected jumpToLatest(): void {
    this.transcript().scrollToOffset({ offset: 0, animated: true });
  }

  protected toggleLive(): void {
    if (this.store.isLive) this.store.stopLive();
    else this.store.startLive();
    this.live.set(this.store.isLive);
  }

  protected toggleOffline(): void {
    this.offline.set(!this.offline());
    this.backend.offline = this.offline();
  }
}
