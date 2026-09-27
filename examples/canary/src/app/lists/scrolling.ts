import { Component, signal } from '@angular/core';
import { Pressable, RefreshControl, ScrollView, Text, View } from '@ng-native/components';
import { NativeHeader } from '@ng-native/router';
import { Example, Section } from '../example.ts';
import { page } from '../screen-styles.ts';

/**
 * Scrolling, which is the clearest case of why the render path matters.
 *
 * A scroll view scrolls on the platform's own thread. Nothing here asks JavaScript for the next
 * frame, so a busy JS thread cannot make a scroll stutter - and the events that report the
 * offset arrive as ordinary Fabric events, at whatever interval was asked for.
 */
@Component({
  selector: 'x-scrolling',
  imports: [Example, NativeHeader, Pressable, RefreshControl, ScrollView, Section, Text, View],
  template: `
    <native-header title="Scrolling" />
    <scroll-view class="screen" [contentContainerStyle]="page.content">
      <refresh-control [(refreshing)]="refreshing" (refresh)="reload()" />
      <text class="hint">
        Native scrolling. The offsets below come back as events; the scroll itself never waits for
        JavaScript.
      </text>
      <text nativeID="refresh-count" class="body">
        Pull the page down to refresh: {{ refreshes() }} so far.
      </text>

      <x-section title="Direction">
        <x-example
          title="Horizontal"
          note="One row, scrolled sideways. The content container is what takes the padding and
                the gap, not the scroll view."
          code='[horizontal]="true"'
        >
          <scroll-view
            [horizontal]="true"
            class="strip"
            [contentContainerStyle]="stripContent"
            [showsHorizontalScrollIndicator]="false"
          >
            @for (n of many; track n) {
              <view [style]="tile"
                ><text class="strong">{{ n }}</text></view
              >
            }
          </scroll-view>
        </x-example>

        <x-example
          title="Paging"
          note="Each swipe settles on a whole page rather than anywhere. The platform does the
                snapping."
          code='[pagingEnabled]="true"'
        >
          <scroll-view
            [horizontal]="true"
            [pagingEnabled]="true"
            [style]="pager"
            [showsHorizontalScrollIndicator]="false"
          >
            @for (colour of pages; track colour) {
              <view
                [style]="{
                  width: 300,
                  height: 110,
                  backgroundColor: colour,
                  alignItems: 'center',
                  justifyContent: 'center',
                }"
              >
                <text class="strong">swipe</text>
              </view>
            }
          </scroll-view>
        </x-example>
      </x-section>

      <x-section title="Reading the offset">
        <x-example
          title="(scroll)"
          note="The number updates as you drag. scrollEventThrottle decides how often native
                bothers to tell us - it is a budget, not a nicety."
          code='(scroll) [scrollEventThrottle]="16"'
        >
          <scroll-view
            class="strip"
            [contentContainerStyle]="tallContent"
            [scrollEventThrottle]="16"
            (scroll)="offset.set(Math.round($event.nativeEvent.contentOffset.y))"
          >
            @for (n of many; track n) {
              <view class="bar"></view>
            }
          </scroll-view>
          <text class="body">offset {{ offset() }}px</text>
        </x-example>
      </x-section>

      <x-section title="Behaviour">
        <x-example
          title="Bounce, off"
          note="iOS rubber-bands past the end by default. Turning it off is what makes a scroll
                view feel like a list rather than a page."
          code='[bounces]="false"'
        >
          <scroll-view class="strip" [bounces]="false" [contentContainerStyle]="tallContent">
            @for (n of many; track n) {
              <view class="bar"></view>
            }
          </scroll-view>
        </x-example>

        <x-example
          title="Scroll indicators, hidden"
          note="The content is the same; only the indicator has gone."
          code='[showsVerticalScrollIndicator]="false"'
        >
          <scroll-view
            class="strip"
            [showsVerticalScrollIndicator]="false"
            [contentContainerStyle]="tallContent"
          >
            @for (n of many; track n) {
              <view class="bar"></view>
            }
          </scroll-view>
        </x-example>
      </x-section>

      <x-section title="Nesting">
        <x-example
          title="A horizontal strip inside a vertical page"
          note="Drag sideways and the page does not move; drag down and the strip does not. The
                responder negotiation is native, which is why it feels right."
          code="a horizontal scroll-view inside this vertical one"
        >
          <scroll-view [horizontal]="true" class="strip" [contentContainerStyle]="stripContent">
            @for (n of many; track n) {
              <view [style]="tile"
                ><text class="strong">{{ n }}</text></view
              >
            }
          </scroll-view>
          <text class="hint"> Both directions work without either stealing from the other. </text>
        </x-example>
      </x-section>

      <x-section title="Under load">
        <x-example
          title="Block the JS thread and scroll"
          note="The button spins for a second in JavaScript. Scroll anything on this screen while
                it does: it keeps moving, because the scroll never needed us."
          code="a 1s busy loop on the JS thread"
        >
          <pressable class="button" (press)="block()">
            <text class="button-label">
              {{ blocked() ? 'blocking...' : 'Block JS for 1s' }}
            </text>
          </pressable>
        </x-example>
      </x-section>
    </scroll-view>
  `,
  styles: `
    .strip {
      height: 110px;
      background-color: var(--card-inset);
      border-radius: 8px;
    }

    .bar {
      height: 26px;
      border-radius: 6px;
      background-color: var(--card);
    }
  `,
})
export class ScrollingPage {
  protected readonly page = page;
  protected readonly Math = Math;
  protected readonly many = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  protected readonly pages = ['#3b6ef5', '#c83ca0', '#2fbf9f'];
  protected readonly offset = signal(0);
  protected readonly blocked = signal(false);
  protected readonly refreshing = signal(false);
  protected readonly refreshes = signal(0);

  protected readonly stripContent = {
    flexDirection: 'row',
    gap: 8,
    padding: 8,
    alignItems: 'center',
  };
  protected readonly tallContent = { padding: 8, gap: 8 };
  protected readonly pager = { height: 110, borderRadius: 8, overflow: 'hidden' };
  protected readonly tile = {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#3b6ef5',
    alignItems: 'center',
    justifyContent: 'center',
  };

  /**
   * The pull has already started the spinner; saying so keeps it going until the work is done.
   * On Android the swipe layout wraps this scroll view, so a pull only arrives if it does.
   */
  protected reload(): void {
    console.log('(refresh)');
    this.refreshing.set(true);
    setTimeout(() => {
      this.refreshes.update((count) => count + 1);
      this.refreshing.set(false);
    }, 800);
  }

  /** Deliberately synchronous: an await would let the frame through and prove nothing. */
  protected block(): void {
    this.blocked.set(true);
    setTimeout(() => {
      const until = Date.now() + 1000;
      while (Date.now() < until) {
        /* hold the thread */
      }
      this.blocked.set(false);
    }, 0);
  }
}
