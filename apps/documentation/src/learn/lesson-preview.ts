/**
 * The phone: a device drawn around the preview frame, the platform, colour scheme and X-ray
 * toggles above it, and what went wrong laid over the last app that worked.
 *
 * It runs the files it is given whenever they change, a moment after the typing stops, and says
 * how each run went through `ran`. Checks and tests go through the same frame, so the lesson page
 * asks for them here.
 */
import {
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
  type OnDestroy,
} from '@angular/core';
import { PreviewClient, type RunResult } from './preview-client.ts';
import type { CheckOutcome, Files, Platform, Problem, Scheme, TestOutcome } from './protocol.ts';

/** The screens drawn: an iPhone 16 and a Pixel 9, in points. */
const SCREENS: Record<Platform, { width: number; height: number }> = {
  ios: { width: 393, height: 852 },
  android: { width: 412, height: 892 },
};

const BEZEL = 12;
const DEBOUNCE_MS = 350;

export const PROBLEM_TITLES: Record<Problem['kind'], string> = {
  syntax: 'Syntax error',
  import: 'Import error',
  template: 'Template error',
  runtime: 'Error',
  css: 'Native build',
  device: 'On a device',
  console: 'Angular says',
};

export function whereOf(problem: Problem): string {
  if (!problem.file) return '';
  return problem.line ? `${problem.file}:${problem.line}` : problem.file;
}

@Component({
  selector: 'learn-lesson-preview',
  host: {
    class: 'flex min-h-0 flex-col items-center gap-3',
    // How many runs have finished, so a caller - `e2e/learn.spec.ts`, chiefly - can wait for the
    // run started by a particular edit to have actually landed on the phone, instead of guessing
    // how long a debounce plus a round trip to the frame takes and waiting that long regardless.
    '[attr.data-run-count]': 'runCount()',
  },
  template: `
    <div
      class="flex flex-wrap items-center justify-center gap-2"
      role="toolbar"
      aria-label="Preview"
    >
      <div
        class="flex rounded-lg border border-border-default p-0.5"
        role="group"
        aria-label="Platform"
      >
        @for (option of platforms; track option.value) {
          <button
            type="button"
            class="h-7 rounded-md px-2.5 text-xs font-medium transition-colors"
            [class]="
              platform() === option.value
                ? 'bg-surface-raised text-fg shadow-sm'
                : 'text-fg-tertiary hover:text-fg'
            "
            [attr.aria-pressed]="platform() === option.value"
            (click)="platform.set(option.value)"
          >
            {{ option.label }}
          </button>
        }
      </div>
      <button
        type="button"
        class="h-8 rounded-lg border border-border-default px-2.5 text-xs font-medium transition-colors"
        [class]="
          scheme() === 'dark' ? 'bg-surface-raised text-fg' : 'text-fg-tertiary hover:text-fg'
        "
        [attr.aria-pressed]="scheme() === 'dark'"
        (click)="scheme.set(scheme() === 'dark' ? 'light' : 'dark')"
      >
        Dark
      </button>
      <button
        type="button"
        class="h-8 rounded-lg border border-border-default px-2.5 text-xs font-medium transition-colors"
        [class]="xray() ? 'bg-surface-raised text-fg' : 'text-fg-tertiary hover:text-fg'"
        [attr.aria-pressed]="xray()"
        (click)="xray.set(!xray())"
      >
        X-ray
      </button>
    </div>

    <div
      #stage
      class="relative flex min-h-0 w-full flex-1 items-start justify-center overflow-hidden"
    >
      <div
        class="device relative shrink-0 origin-top"
        [class.device-android]="platform() === 'android'"
        [class.device-dark]="scheme() === 'dark'"
        [style.width.px]="size().width + bezel * 2"
        [style.height.px]="size().height + bezel * 2"
        [style.transform]="'scale(' + scale() + ')'"
        [style.margin-bottom.px]="(size().height + bezel * 2) * (scale() - 1)"
      >
        <div class="device-screen" [style.inset.px]="bezel">
          <iframe
            #frame
            title="Preview"
            sandbox="allow-scripts"
            class="block h-full w-full border-0"
          ></iframe>
          <div class="device-status" aria-hidden="true">
            <span>9:41</span>
            <span class="device-status-icons">
              <svg viewBox="0 0 18 12" width="18" height="12">
                <path fill="currentColor" d="M1 8h3v4H1zM6 6h3v6H6zM11 3h3v9h-3zM16 0h2v12h-2z" />
              </svg>
              <svg viewBox="0 0 26 12" width="25" height="12">
                <rect
                  x=".5"
                  y=".5"
                  width="22"
                  height="11"
                  rx="3"
                  fill="none"
                  stroke="currentColor"
                  opacity=".4"
                />
                <rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor" />
                <rect
                  x="24"
                  y="4"
                  width="1.5"
                  height="4"
                  rx=".75"
                  fill="currentColor"
                  opacity=".4"
                />
              </svg>
            </span>
          </div>
          <div class="device-camera" aria-hidden="true"></div>
          <div class="device-home" aria-hidden="true"></div>

          @if (blocking(); as problem) {
            <div
              class="absolute inset-x-3 bottom-8 z-10 max-h-[55%] overflow-auto rounded-2xl bg-[#3b0a0f]/95 p-4 text-white shadow-2xl backdrop-blur"
              role="alert"
            >
              <div class="flex items-baseline justify-between gap-3">
                <h3 class="text-sm font-semibold">{{ titles[problem.kind] }}</h3>
                @if (whereOf(problem); as where) {
                  <button
                    type="button"
                    class="font-mono text-xs text-white/80 underline underline-offset-2 hover:text-white"
                    (click)="jump.emit(problem)"
                  >
                    {{ where }}
                  </button>
                }
              </div>
              <p
                class="mt-2 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-white/90"
              >
                {{ problem.message }}
              </p>
              @if (showingOld()) {
                <p class="mt-3 text-[11px] text-white/60">
                  The app behind this is the last version that ran.
                </p>
              }
            </div>
          }
        </div>
      </div>
    </div>

    @if (notes().length) {
      <ul class="flex w-full max-w-md flex-col gap-1.5" aria-label="Notes">
        @for (note of notes(); track $index) {
          <li
            class="rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-xs text-fg-secondary"
          >
            <span class="font-medium text-fg">{{ titles[note.kind] }}</span>
            @if (whereOf(note); as where) {
              <button
                type="button"
                class="ml-1 font-mono text-fg-tertiary underline underline-offset-2 hover:text-fg"
                (click)="jump.emit(note)"
              >
                {{ where }}
              </button>
            }
            <span class="block font-mono text-[11px] break-words">{{ note.message }}</span>
          </li>
        }
      </ul>
    }
  `,
  styles: `
    .device {
      border-radius: 60px;
      background: #0c0c0e;
      box-shadow:
        0 0 0 1px rgb(255 255 255 / 0.08) inset,
        0 30px 60px -20px rgb(0 0 0 / 0.45),
        0 0 0 1px var(--border-default);
    }
    .device-android {
      border-radius: 44px;
    }
    .device-screen {
      position: absolute;
      overflow: hidden;
      border-radius: 48px;
      background: #fff;
    }
    .device-android .device-screen {
      border-radius: 32px;
    }
    .device-dark .device-screen {
      background: #000;
    }
    .device-status {
      position: absolute;
      inset: 0 0 auto;
      z-index: 5;
      display: flex;
      height: 54px;
      align-items: center;
      justify-content: space-between;
      padding: 4px 34px 0 44px;
      font:
        600 16px/1 -apple-system,
        system-ui,
        sans-serif;
      color: #000;
      pointer-events: none;
    }
    .device-android .device-status {
      height: 28px;
      padding: 0 20px;
      font:
        500 13px/1 Roboto,
        system-ui,
        sans-serif;
    }
    .device-dark .device-status {
      color: #fff;
    }
    .device-status-icons {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .device-camera {
      position: absolute;
      top: 11px;
      left: 50%;
      z-index: 6;
      width: 124px;
      height: 36px;
      border-radius: 18px;
      background: #000;
      transform: translateX(-50%);
      pointer-events: none;
    }
    .device-android .device-camera {
      top: 8px;
      width: 12px;
      height: 12px;
      border-radius: 6px;
    }
    .device-home {
      position: absolute;
      bottom: 8px;
      left: 50%;
      z-index: 5;
      width: 136px;
      height: 5px;
      border-radius: 3px;
      background: rgb(0 0 0 / 0.8);
      transform: translateX(-50%);
      pointer-events: none;
    }
    .device-android .device-home {
      bottom: 6px;
      width: 108px;
      height: 4px;
    }
    .device-dark .device-home {
      background: rgb(255 255 255 / 0.8);
    }
  `,
})
export class LessonPreview implements OnDestroy {
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly frame = viewChild.required<ElementRef<HTMLIFrameElement>>('frame');

  readonly files = input.required<Files>();
  readonly entry = input('app.ts');
  /** The files as the lesson started; see `baseline` in `protocol.ts`. */
  readonly baseline = input<Files>();
  readonly ran = output<RunResult>();
  /** A problem's place in the files was chosen, to show it in the editor. */
  readonly jump = output<Problem>();
  /** Everything wrong right now, for the editor to mark: the last run's, and since. */
  readonly problems = output<readonly Problem[]>();

  protected readonly platform = signal<Platform>('ios');
  protected readonly scheme = signal<Scheme>('light');
  protected readonly xray = signal(false);

  protected readonly platforms = [
    { value: 'ios' as const, label: 'iOS' },
    { value: 'android' as const, label: 'Android' },
  ];
  protected readonly titles = PROBLEM_TITLES;
  protected readonly whereOf = whereOf;
  protected readonly bezel = BEZEL;

  /** What stopped the last run, or broke the app since. Shown over the phone. */
  private readonly runProblems = signal<readonly Problem[]>([]);
  private readonly laterProblems = signal<readonly Problem[]>([]);
  private readonly deviceNotes = signal<readonly Problem[]>([]);
  /** Whether any run has put an app on screen, so an error can say it is over an older one. */
  private readonly everRan = signal(false);
  /** Runs finished so far. See the host binding above for why this is public and on the host. */
  protected readonly runCount = signal(0);

  protected readonly blocking = computed(
    () =>
      this.runProblems()[0] ?? this.laterProblems().find((problem) => problem.kind !== 'console'),
  );
  protected readonly showingOld = computed(() => this.runProblems().length > 0 && this.everRan());
  protected readonly notes = computed(() => [
    ...this.deviceNotes(),
    ...this.laterProblems().filter((problem) => problem.kind === 'console'),
  ]);

  protected readonly size = computed(() => SCREENS[this.platform()]);
  private readonly available = signal({ width: 0, height: 0 });
  protected readonly scale = computed(() => {
    const { width, height } = this.available();
    const device = { width: this.size().width + BEZEL * 2, height: this.size().height + BEZEL * 2 };
    if (!width || !height) return 0.75;
    return Math.min(1, width / device.width, height / device.height);
  });

  private client: PreviewClient | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly resize = new ResizeObserver(([entry]) => {
    if (entry)
      this.available.set({ width: entry.contentRect.width, height: entry.contentRect.height });
  });

  constructor() {
    effect(() => {
      const frame = this.frame().nativeElement;
      if (this.client) return;
      this.resize.observe(this.stage().nativeElement);
      this.client = new PreviewClient(frame, untracked(this.platform), {
        problem: (problem) => this.addLaterProblem(problem),
        notes: (notes) => this.deviceNotes.set(notes),
        reloaded: () => this.schedule(0),
      });
    });
    effect(() => {
      this.files();
      this.entry();
      this.schedule(DEBOUNCE_MS);
    });
    effect(() =>
      this.problems.emit([...this.runProblems(), ...this.laterProblems(), ...this.deviceNotes()]),
    );
    effect(() => void this.client?.setPlatform(this.platform()));
    effect(() => this.client?.setAppearance({ scheme: this.scheme(), xray: this.xray() }));
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
    this.resize.disconnect();
    this.client?.destroy();
  }

  check(checks: string, step: number): Promise<readonly CheckOutcome[]> {
    return this.client ? this.client.check(this.files(), checks, step) : Promise.resolve([]);
  }

  test(file: string): Promise<readonly TestOutcome[]> {
    return this.client ? this.client.test(this.files(), file) : Promise.resolve([]);
  }

  private addLaterProblem(problem: Problem): void {
    this.laterProblems.update((problems) => [...problems, problem].slice(-20));
  }

  private schedule(delay: number): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.run(), delay);
  }

  private async run(): Promise<void> {
    if (!this.client) return;
    let result: RunResult;
    try {
      result = await this.client.run(this.files(), this.entry(), this.baseline());
    } catch (error) {
      result = { ok: false, problems: [{ kind: 'runtime', message: (error as Error).message }] };
    }
    this.runProblems.set(result.problems);
    if (result.ok) {
      this.laterProblems.set([]);
      this.everRan.set(true);
    }
    this.ran.emit(result);
    this.runCount.update((count) => count + 1);
  }
}
