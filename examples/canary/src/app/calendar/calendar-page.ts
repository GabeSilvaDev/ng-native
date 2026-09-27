import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Gesture } from 'react-native-gesture-handler';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { GestureRoot, NativeGesture } from '@ng-native/components/gestures';
import { NativeHeader } from '@ng-native/router';
import {
  Agenda,
  CALENDAR_TONES,
  DAY_END,
  DAY_START,
  HOUR,
  clock,
  dateOf,
  lanes,
  minuteAt,
  monthGrid,
  type CalendarEvent,
  type Day,
} from './calendar-model.ts';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
const LONG_DAY = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/**
 * A calendar: the month as a grid, a day's events laid out on a timeline beside the hours, and
 * a new event drawn by pressing and holding on the timeline and dragging down to its end.
 *
 * An event's place is CSS arithmetic on tokens bound per event, `calc((var(--start) - 420) *
 * 64px / 60)`, worked out on device; a calendar's colour is one token its block, rail and text
 * derive from.
 */
@Component({
  selector: 'x-calendar',
  imports: [GestureRoot, NativeGesture, NativeHeader, Pressable, ScrollView, Text, View],
  template: `
    <native-header [title]="monthTitle()" [largeTitle]="true" />
    <gesture-root>
      <scroll-view
        class="page"
        contentInsetAdjustmentBehavior="automatic"
        [gesture]="pageGesture"
        [scrollEnabled]="draft() === null"
      >
        <view class="month">
          <view class="nav">
            <pressable
              class="step"
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              (press)="step(-1)"
            >
              <text class="step-glyph">‹</text>
            </pressable>
            <text class="month-name">{{ monthTitle() }}</text>
            <pressable
              class="step"
              accessibilityRole="button"
              accessibilityLabel="Next month"
              (press)="step(1)"
            >
              <text class="step-glyph">›</text>
            </pressable>
          </view>
          <view class="weekdays">
            @for (name of weekdays; track $index) {
              <text class="weekday">{{ name }}</text>
            }
          </view>
          @for (week of weeks(); track week[0]) {
            <view class="week">
              @for (day of week; track day) {
                <pressable
                  class="day"
                  [class.outside]="!inMonth(day)"
                  [class.today]="day === agenda.today"
                  [class.chosen]="day === agenda.selected()"
                  accessibilityRole="button"
                  [accessibilityLabel]="dayLabel(day)"
                  [accessibilityState]="{ selected: day === agenda.selected() }"
                  (press)="agenda.selected.set(day)"
                >
                  <view class="day-disc"
                    ><text class="day-number">{{ dateOf(day).getDate() }}</text></view
                  >
                  <view class="dots">
                    @for (calendar of agenda.busy().get(day) ?? []; track calendar) {
                      <view class="dot" [style.--tone]="tones[calendar]"></view>
                    }
                  </view>
                </pressable>
              }
            </view>
          }
        </view>

        <view class="day-head">
          <text class="day-title">{{ selectedTitle() }}</text>
          <pressable
            class="add"
            accessibilityRole="button"
            accessibilityLabel="Add event at 10:00"
            (press)="addAtTen()"
          >
            <text class="add-label">+ 10:00</text>
          </pressable>
        </view>

        <view class="timeline" [gesture]="draw" [style.height.px]="timelineHeight">
          @for (hour of hours; track hour) {
            <view class="hour" [style.--at]="hour * 60">
              <text class="hour-label">{{ clockOf(hour * 60) }}</text>
              <view class="hour-line"></view>
            </view>
          }
          @for (event of agenda.selectedEvents(); track event.id) {
            <view
              class="event"
              [style.--start]="event.start"
              [style.--end]="event.end"
              [style.--tone]="tones[event.calendar]"
              [style.left.%]="laneLeft(event)"
              [style.width.%]="laneWidth(event)"
              [accessible]="true"
              [accessibilityLabel]="
                event.title + ', ' + clockOf(event.start) + ' to ' + clockOf(event.end)
              "
              [accessibilityActions]="eventActions"
              (accessibilityAction)="agenda.remove(event.id)"
            >
              <text class="event-title" [numberOfLines]="1">{{ event.title }}</text>
              @if (event.end - event.start >= 30) {
                <text class="event-time"
                  >{{ clockOf(event.start) }} to {{ clockOf(event.end) }}</text
                >
              }
            </view>
          }
          @if (showNow()) {
            <view class="now" [style.--now]="now()" accessibilityLabel="Now">
              <view class="now-dot"></view>
            </view>
          }
          @if (draft(); as span) {
            <view
              class="event draft"
              [style.--start]="span.from"
              [style.--end]="span.to"
              [style.left.%]="0"
              [style.width.%]="100"
            >
              <text class="event-title">New event</text>
              <text class="event-time">{{ clockOf(span.from) }} to {{ clockOf(span.to) }}</text>
            </view>
          }
        </view>
      </scroll-view>
    </gesture-root>
  `,
  styles: `
    :host {
      --accent: oklch(0.55 0.22 275);
      --ink: light-dark(oklch(0.2 0.02 275), oklch(0.96 0.01 275));
      --soft: light-dark(oklch(0.55 0.02 275), oklch(0.7 0.02 275));
      --surface: light-dark(white, oklch(0.22 0.02 275));
    }
    .page {
      flex: 1;
      background-color: light-dark(oklch(0.975 0.006 275), oklch(0.15 0.02 275));
    }
    .month {
      margin: 4px 12px 16px;
      padding: 12px 8px 8px;
      border-radius: 24px;
      background-color: var(--surface);
      box-shadow: 0 12px 30px -18px light-dark(rgba(30, 27, 75, 0.35), black);
    }
    .nav {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      padding: 0 6px 8px;
    }
    .month-name {
      color: var(--ink);
      font-size: 17px;
      font-weight: 700;
    }
    .step {
      width: 36px;
      height: 36px;
      border-radius: 18px;
      align-items: center;
      justify-content: center;
      background-color: oklch(from var(--accent) l c h / 0.1);
    }
    .step:active {
      background-color: oklch(from var(--accent) l c h / 0.22);
    }
    .step-glyph {
      color: var(--accent);
      font-size: 24px;
      font-weight: 600;
      margin-top: -3px;
    }
    .weekdays,
    .week {
      flex-direction: row;
    }
    .weekday {
      width: calc(100% / 7);
      text-align: center;
      color: var(--soft);
      font-size: 12px;
      font-weight: 700;
    }
    .weekday:nth-child(n + 6) {
      color: oklch(from var(--accent) l c calc(h + 60));
    }
    .day {
      width: calc(100% / 7);
      align-items: center;
      padding: 4px 0;
    }
    .day:nth-child(n + 6) .day-number {
      color: oklch(from var(--accent) l c calc(h + 60));
    }
    .day-disc {
      width: 38px;
      height: 38px;
      border-radius: 19px;
      align-items: center;
      justify-content: center;
    }
    .day-number {
      color: var(--ink);
      font-size: 16px;
      font-weight: 500;
      font-variant-numeric: tabular-nums;
    }
    .outside {
      opacity: 0.3;
    }
    .today .day-disc {
      box-shadow: 0 0 0 2px var(--accent) inset;
    }
    .today .day-number {
      color: var(--accent);
      font-weight: 800;
    }
    .chosen .day-disc {
      background-image: linear-gradient(
        140deg,
        oklch(from var(--accent) calc(l + 0.08) c calc(h - 20)),
        var(--accent)
      );
      box-shadow: 0 6px 14px -6px oklch(from var(--accent) l c h / 0.7);
    }
    .chosen .day-number,
    .chosen.today .day-number {
      color: white;
      font-weight: 800;
    }
    .dots {
      flex-direction: row;
      gap: 3px;
      height: 6px;
      margin-top: 3px;
    }
    .dot {
      width: 5px;
      height: 5px;
      border-radius: 3px;
      background-color: var(--tone);
    }
    .day-head {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      margin: 0 20px 8px;
    }
    .day-title {
      color: var(--ink);
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.3px;
    }
    .add {
      padding: 7px 12px;
      border-radius: 999px;
      background-color: var(--accent);
      transition: scale 120ms ease-out;
    }
    .add:active {
      scale: 0.94;
    }
    .add-label {
      color: white;
      font-size: 14px;
      font-weight: 700;
    }
    .timeline {
      margin: 0 12px 60px 64px;
    }
    .hour {
      position: absolute;
      left: -56px;
      right: 0;
      top: calc((var(--at) - 420) * 64px / 60 - 8px);
      flex-direction: row;
      align-items: center;
      gap: 8px;
    }
    .hour-label {
      width: 44px;
      text-align: right;
      color: var(--soft);
      font-size: 11px;
      font-variant-numeric: tabular-nums;
    }
    .hour-line {
      flex: 1;
      height: 1px;
      background-color: light-dark(rgba(30, 27, 75, 0.08), rgba(255, 255, 255, 0.08));
    }
    .event {
      position: absolute;
      top: calc((var(--start) - 420) * 64px / 60 + 1px);
      height: calc((var(--end) - var(--start)) * 64px / 60 - 2px);
      padding: 1px 8px;
      overflow: hidden;
      border-radius: 10px;
      border-left-width: 3px;
      border-color: var(--tone);
      background-color: light-dark(
        oklch(from var(--tone) 0.94 calc(c * 0.25) h),
        oklch(from var(--tone) 0.3 calc(c * 0.5) h)
      );
    }
    .event-title {
      color: light-dark(
        oklch(from var(--tone) 0.35 c h),
        oklch(from var(--tone) 0.9 calc(c * 0.5) h)
      );
      font-size: 13px;
      font-weight: 700;
    }
    .event-time {
      color: light-dark(
        oklch(from var(--tone) 0.5 calc(c * 0.7) h),
        oklch(from var(--tone) 0.78 calc(c * 0.4) h)
      );
      font-size: 11px;
      font-variant-numeric: tabular-nums;
    }
    .draft {
      --tone: var(--accent);
      opacity: 0.85;
      border-style: dashed;
      border-width: 1.5px;
      border-left-width: 3px;
    }
    .now {
      position: absolute;
      left: -6px;
      right: 0;
      height: 2px;
      top: calc((var(--now) - 420) * 64px / 60 - 1px);
      background-color: oklch(0.63 0.24 25);
    }
    .now-dot {
      position: absolute;
      left: -4px;
      top: -4px;
      width: 10px;
      height: 10px;
      border-radius: 5px;
      background-color: oklch(0.63 0.24 25);
    }
  `,
})
export class CalendarPage {
  protected readonly agenda = inject(Agenda);
  protected readonly weekdays = WEEKDAYS;
  protected readonly tones = CALENDAR_TONES;
  protected readonly hours = Array.from(
    { length: DAY_END - DAY_START + 1 },
    (_, i) => DAY_START + i,
  );
  protected readonly timelineHeight = (DAY_END - DAY_START) * HOUR + 16;
  protected readonly eventActions = [{ name: 'delete', label: 'Delete' }];
  protected readonly clockOf = clock;
  protected readonly dateOf = dateOf;

  private readonly shown = signal(this.monthOf(this.agenda.today));
  protected readonly weeks = computed(() => monthGrid(this.shown().year, this.shown().month));
  protected readonly monthTitle = computed(() =>
    MONTH.format(new Date(this.shown().year, this.shown().month, 1)),
  );
  protected readonly selectedTitle = computed(() =>
    LONG_DAY.format(dateOf(this.agenda.selected())),
  );
  private readonly placed = computed(() => lanes(this.agenda.selectedEvents()));

  protected readonly now = signal(this.minutesNow());
  protected readonly showNow = computed(
    () =>
      this.agenda.selected() === this.agenda.today &&
      this.now() >= DAY_START * 60 &&
      this.now() <= DAY_END * 60,
  );

  /** The event being drawn, from where the hold began to where the finger is. */
  protected readonly draft = signal<{ readonly from: number; readonly to: number } | null>(null);
  /** The page's own scrolling, which a press on the timeline runs beside until it becomes a draw. */
  protected readonly pageGesture = Gesture.Native();
  protected readonly draw;

  constructor() {
    const timer = setInterval(() => this.now.set(this.minutesNow()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));

    // Read through locals: a gesture callback is rewritten into a worklet, which has no `this`.
    const draft = this.draft;
    const agenda = this.agenda;
    this.draw = Gesture.Pan()
      .runOnJS(true)
      .activateAfterLongPress(300)
      .simultaneousWithExternalGesture(this.pageGesture)
      .onStart((event) => {
        const from = minuteAt(event.y);
        draft.set({ from, to: from + 30 });
      })
      .onUpdate((event) => {
        const span = draft();
        if (span) draft.set({ from: span.from, to: Math.max(span.from + 15, minuteAt(event.y)) });
      })
      .onEnd(() => {
        const span = draft();
        if (span) agenda.add(agenda.selected(), span.from, span.to);
      })
      .onFinalize(() => draft.set(null));
  }

  protected inMonth(day: Day): boolean {
    const date = dateOf(day);
    return date.getMonth() === this.shown().month && date.getFullYear() === this.shown().year;
  }

  protected dayLabel(day: Day): string {
    const count = this.agenda.events().filter((event) => event.day === day).length;
    return `${LONG_DAY.format(dateOf(day))}, ${count === 1 ? '1 event' : `${count} events`}`;
  }

  protected step(by: number): void {
    const { year, month } = this.shown();
    this.shown.set(this.monthOf(`${year}-${String(month + 1).padStart(2, '0')}-01`, by));
  }

  protected laneLeft(event: CalendarEvent): number {
    const place = this.placed().get(event.id);
    return place ? (place.lane / place.of) * 100 : 0;
  }

  protected laneWidth(event: CalendarEvent): number {
    const place = this.placed().get(event.id);
    return place ? 100 / place.of : 100;
  }

  protected addAtTen(): void {
    this.agenda.add(this.agenda.selected(), 10 * 60, 11 * 60);
  }

  private monthOf(day: Day, by = 0): { year: number; month: number } {
    const date = dateOf(day);
    const moved = new Date(date.getFullYear(), date.getMonth() + by, 1);
    return { year: moved.getFullYear(), month: moved.getMonth() };
  }

  private minutesNow(): number {
    const date = new Date();
    return date.getHours() * 60 + date.getMinutes();
  }
}
