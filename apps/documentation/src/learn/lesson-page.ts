/**
 * A lesson: the steps on the left, the editor in the middle and the phone on the right.
 *
 * The files are the learner's own from the moment the lesson opens, and are saved as they change.
 * Every time the preview runs them successfully, the checks for the step they are on run too,
 * and a step whose checks all pass is marked done.
 */
import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  resource,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { CodeEditor } from './code-editor.ts';
import { checkFileName } from './file-name.ts';
import { COURSE_TITLE, LESSONS, loadLesson, orderFiles, type Lesson } from './course.ts';
import { LessonPreview } from './lesson-preview.ts';
import type { RunResult } from './preview-client.ts';
import { LearnProgress } from './progress.ts';
import type { CheckOutcome, Files, Problem, TestOutcome } from './protocol.ts';
import { Seo } from '../seo.ts';
import { SITE_NAME } from '../site.ts';

type CheckState = 'waiting' | 'running' | 'stale' | 'done';

@Component({
  selector: 'learn-lesson-page',
  imports: [CodeEditor, LessonPreview, RouterLink],
  host: { class: 'block' },
  template: `
    @if (lesson.error()) {
      <div class="prose mx-auto max-w-2xl py-16">
        <h1>No such lesson</h1>
        <p><a routerLink="/learn">Back to the course</a></p>
      </div>
    } @else if (lesson.value(); as lesson) {
      <div class="learn-workspace">
        <aside class="learn-steps flex min-h-0 flex-col border-border-subtle">
          <div class="shrink-0 border-b border-border-subtle px-5 py-4">
            <a routerLink="/learn" class="text-xs font-medium text-fg-tertiary hover:text-fg">{{
              courseTitle
            }}</a>
            <h1 class="mt-1 font-display text-xl font-semibold tracking-tight text-fg">
              <span class="text-fg-tertiary">{{ lesson.number }}.</span> {{ lesson.title }}
            </h1>
            <ol class="mt-3 flex gap-1.5" aria-label="Steps">
              @for (item of lesson.steps; track $index) {
                <li class="flex-1">
                  <button
                    type="button"
                    class="h-1.5 w-full rounded-full transition-colors"
                    [class]="stepClass($index)"
                    [attr.aria-label]="'Step ' + ($index + 1) + ': ' + item.title"
                    [attr.aria-current]="$index === step() ? 'step' : null"
                    (click)="goToStep($index)"
                  ></button>
                </li>
              }
            </ol>
          </div>

          <div class="min-h-0 flex-1 overflow-auto px-5 py-5">
            @if (step() === 0) {
              <div class="prose learn-prose mb-6" [innerHTML]="prose()?.intro"></div>
            }
            @if (currentStep(); as current) {
              <p class="text-xs font-medium tracking-wide text-fg-tertiary uppercase">
                Step {{ step() + 1 }} of {{ lesson.steps.length }}
              </p>
              <h2 class="mt-1 font-display text-lg font-semibold text-fg">{{ current.title }}</h2>
              <div class="prose learn-prose mt-3" [innerHTML]="prose()?.steps?.[step()]"></div>
            }

            <section class="mt-6" aria-label="Checks">
              <ul class="flex flex-col gap-2">
                @for (outcome of stepChecks(); track outcome.name) {
                  <li
                    class="flex gap-2.5 rounded-lg border border-border-subtle px-3 py-2.5 text-sm"
                    [class.opacity-60]="checkState() === 'stale'"
                  >
                    <span
                      class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      [class]="outcome.ok ? 'bg-emerald-600' : 'bg-fg-quaternary'"
                      aria-hidden="true"
                      >{{ outcome.ok ? '✓' : '' }}</span
                    >
                    <div class="min-w-0">
                      <p class="text-fg" [attr.data-check]="outcome.ok ? 'pass' : 'fail'">
                        {{ outcome.name }}
                      </p>
                      @if (!outcome.ok && checkState() === 'done') {
                        <p class="mt-1 text-xs text-fg-tertiary">
                          {{ outcome.hint ?? firstLine(outcome.error) }}
                        </p>
                      }
                    </div>
                  </li>
                }
              </ul>
              @if (checkState() === 'stale') {
                <p class="mt-2 text-xs text-fg-tertiary">
                  These are from the last version that ran.
                </p>
              }
            </section>
          </div>

          <div
            class="flex shrink-0 items-center justify-between gap-3 border-t border-border-subtle px-5 py-3"
          >
            <button
              type="button"
              class="learn-button"
              [disabled]="step() === 0"
              (click)="goToStep(step() - 1)"
            >
              Back
            </button>
            @if (step() < lesson.steps.length - 1) {
              <button
                type="button"
                class="learn-button"
                [class.learn-button-primary]="stepPassed()"
                (click)="goToStep(step() + 1)"
              >
                Next step
              </button>
            } @else if (nextLesson(); as next) {
              <a
                class="learn-button"
                [class.learn-button-primary]="stepPassed()"
                [routerLink]="'/learn/' + next.slug"
              >
                Next lesson
              </a>
            } @else {
              <a class="learn-button" routerLink="/learn">All lessons</a>
            }
          </div>
        </aside>

        <section class="learn-editor flex min-h-0 min-w-0 flex-col" aria-label="Code">
          <div class="flex shrink-0 items-center gap-1 border-b border-border-subtle px-2">
            <div
              class="flex min-w-0 flex-1 gap-0.5 overflow-x-auto"
              role="tablist"
              aria-label="Files"
            >
              @for (name of fileNames(); track name) {
                <div class="relative flex shrink-0 items-center">
                  <button
                    type="button"
                    role="tab"
                    class="h-10 px-3 font-mono text-[13px] transition-colors"
                    [class.pr-1]="name !== lesson.entry"
                    [class]="name === activeFile() ? 'text-fg' : 'text-fg-tertiary hover:text-fg'"
                    [attr.aria-selected]="name === activeFile()"
                    (click)="activeFile.set(name)"
                  >
                    {{ name }}
                    @if (errorsIn(name)) {
                      <span
                        class="ml-1 inline-block size-1.5 rounded-full bg-red-500 align-middle"
                        aria-label="has an error"
                      ></span>
                    }
                  </button>
                  @if (name !== lesson.entry) {
                    <button
                      type="button"
                      class="mr-1 flex size-5 items-center justify-center rounded text-fg-quaternary hover:bg-surface-raised hover:text-fg"
                      [attr.aria-label]="'Remove ' + name"
                      (click)="removeFile(name)"
                    >
                      ×
                    </button>
                  }
                  @if (name === activeFile()) {
                    <span
                      class="pointer-events-none absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand"
                    ></span>
                  }
                </div>
              }
              @if (naming()) {
                <form class="flex shrink-0 items-center gap-2 px-1" (submit)="addFile($event)">
                  <input
                    #newName
                    class="h-7 w-40 rounded-md border bg-surface-page px-2 font-mono text-[13px] text-fg outline-none"
                    [class]="
                      nameError() ? 'border-red-500' : 'border-border-default focus:border-brand'
                    "
                    aria-label="New file name"
                    placeholder="new-habit.ts"
                    autocomplete="off"
                    spellcheck="false"
                    [attr.aria-invalid]="nameError() ? true : null"
                    [attr.aria-describedby]="nameError() ? 'learn-file-name-error' : null"
                    (input)="nameError.set('')"
                    (keydown.escape)="naming.set(false)"
                    (blur)="stopNamingIfEmpty(newName.value)"
                  />
                  @if (nameError(); as error) {
                    <span id="learn-file-name-error" class="text-xs text-red-600" role="alert">{{
                      error
                    }}</span>
                  }
                </form>
              } @else {
                <button
                  type="button"
                  class="flex h-10 w-8 shrink-0 items-center justify-center text-base text-fg-tertiary hover:text-fg"
                  aria-label="New file"
                  (click)="startNaming()"
                >
                  +
                </button>
              }
            </div>
            @if (specFile(); as spec) {
              <button
                type="button"
                class="learn-button learn-button-small"
                (click)="runTests(spec)"
              >
                Run tests
              </button>
            }
            <button type="button" class="learn-button learn-button-small" (click)="reset(lesson)">
              Reset
            </button>
            <button
              type="button"
              class="learn-button learn-button-small"
              (click)="solveStep(lesson)"
            >
              Solve step {{ step() + 1 }}
            </button>
          </div>
          <learn-code-editor
            class="min-h-0 flex-1"
            [files]="files()"
            [file]="activeFile()"
            [problems]="problems()"
            (edited)="edit($event.file, $event.text)"
          />
          @if (tests(); as outcomes) {
            <section
              class="max-h-[40%] shrink-0 overflow-auto border-t border-border-subtle px-4 py-3"
              aria-label="Test results"
            >
              <p class="text-xs font-medium text-fg-secondary">
                {{ passed(outcomes) }} of {{ outcomes.length }} tests passed
              </p>
              <ul class="mt-2 flex flex-col gap-1.5">
                @for (outcome of outcomes; track $index) {
                  <li class="text-sm">
                    <span [class]="outcome.ok ? 'text-emerald-600' : 'text-red-600'">{{
                      outcome.ok ? 'Pass' : 'Fail'
                    }}</span>
                    <span class="ml-2 text-fg">{{ outcome.name }}</span>
                    @if (!outcome.ok) {
                      <pre
                        class="mt-1 overflow-x-auto rounded-md bg-surface-sunken p-2 font-mono text-[11px] whitespace-pre-wrap text-fg-secondary"
                        >{{ outcome.error }}</pre>
                    }
                  </li>
                }
              </ul>
            </section>
          }
        </section>

        <section class="learn-phone flex min-h-0 flex-col px-4 py-4" aria-label="Preview">
          <learn-lesson-preview
            class="min-h-0 flex-1"
            [files]="files()"
            [entry]="lesson.entry"
            [baseline]="lesson.starter"
            (ran)="onRan($event)"
            (jump)="jumpTo($event)"
            (problems)="problems.set($event)"
          />
        </section>
      </div>
    }
  `,
})
export class LessonPage {
  private readonly progress = inject(LearnProgress);
  private readonly seo = inject(Seo);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly editor = viewChild(CodeEditor);
  private readonly preview = viewChild(LessonPreview);
  private readonly newName = viewChild<ElementRef<HTMLInputElement>>('newName');

  /** The lesson's slug, from the route. */
  readonly slug = input.required<string>();

  protected readonly courseTitle = COURSE_TITLE;
  protected readonly lesson = resource({
    params: () => this.slug(),
    loader: async ({ params }) => {
      const lesson = await loadLesson(params);
      if (!lesson) throw new Error(`No lesson called ${params}`);
      return lesson;
    },
  });

  protected readonly files = signal<Files>({});
  protected readonly activeFile = signal('app.ts');
  protected readonly step = signal(0);
  private readonly done = signal<readonly number[]>([]);
  protected readonly problems = signal<readonly Problem[]>([]);
  protected readonly checks = signal<readonly CheckOutcome[]>([]);
  protected readonly checkState = signal<CheckState>('waiting');
  protected readonly tests = signal<readonly TestOutcome[] | undefined>(undefined);
  /** Whether the new file's name is being typed, and what is wrong with the last one tried. */
  protected readonly naming = signal(false);
  protected readonly nameError = signal('');

  protected readonly fileNames = computed(() => orderFiles(this.files()));
  protected readonly specFile = computed(() =>
    this.fileNames().find((name) => name.endsWith('.spec.ts')),
  );
  protected readonly currentStep = computed(() => this.lesson.value()?.steps[this.step()]);

  /**
   * The lesson's prose, trusted. It is HTML `build/markdown.ts` rendered from the site's own
   * markdown at build time, as `doc-content` trusts a page's, and Angular's sanitiser would
   * otherwise strip the `style` attributes Shiki colours code with.
   */
  protected readonly prose = computed(() => {
    const lesson = this.lesson.value();
    if (!lesson) return undefined;
    const trust = (html: string): SafeHtml => this.sanitizer.bypassSecurityTrustHtml(html);
    return { intro: trust(lesson.intro), steps: lesson.steps.map((step) => trust(step.html)) };
  });
  protected readonly stepChecks = computed(() =>
    this.checks().filter((outcome) => outcome.step === this.step() + 1),
  );
  protected readonly stepPassed = computed(() => this.done().includes(this.step()));
  protected readonly nextLesson = computed(() => {
    const at = LESSONS.findIndex((lesson) => lesson.slug === this.slug());
    return LESSONS.slice(at + 1).find((lesson) => !lesson.planned);
  });

  private checkRun = 0;

  constructor() {
    effect(() => {
      if (this.lesson.error()) return;
      const lesson = this.lesson.value();
      if (lesson) untracked(() => this.open(lesson));
    });
    effect(() => this.newName()?.nativeElement.focus());
    effect(() => {
      const lesson = this.lesson.value();
      if (!lesson || this.lesson.error()) return;
      this.seo.apply({
        title: `${lesson.title} - Learn ${SITE_NAME}`,
        description: lesson.summary,
        path: `/learn/${lesson.slug}`,
        type: 'article',
      });
    });
  }

  protected stepClass(index: number): string {
    if (this.done().includes(index)) return 'bg-emerald-600';
    return index === this.step() ? 'bg-fg' : 'bg-border-strong hover:bg-fg-quaternary';
  }

  protected errorsIn(file: string): boolean {
    return this.problems().some((problem) => problem.file === file && problem.kind !== 'css');
  }

  protected passed(outcomes: readonly TestOutcome[]): number {
    return outcomes.filter((outcome) => outcome.ok).length;
  }

  protected firstLine(text: string | undefined): string {
    return (text ?? '').split('\n')[0] ?? '';
  }

  protected goToStep(index: number): void {
    const lesson = this.lesson.value();
    if (!lesson) return;
    this.step.set(Math.max(0, Math.min(index, lesson.steps.length - 1)));
    this.save();
    void this.runChecks();
  }

  protected edit(file: string, text: string): void {
    this.files.update((files) => ({ ...files, [file]: text }));
    this.save();
  }

  protected startNaming(): void {
    this.nameError.set('');
    this.naming.set(true);
  }

  protected stopNamingIfEmpty(typed: string): void {
    if (!typed.trim()) this.naming.set(false);
  }

  protected addFile(event: Event): void {
    event.preventDefault();
    const result = checkFileName(this.newName()?.nativeElement.value ?? '', this.fileNames());
    if ('error' in result) {
      this.nameError.set(result.error);
      return;
    }
    this.naming.set(false);
    this.edit(result.name, '');
    this.activeFile.set(result.name);
  }

  protected removeFile(name: string): void {
    const empty = !this.files()[name]?.trim();
    if (!empty && !confirm(`Remove ${name}? What is in it will be lost.`)) return;
    this.files.update(({ [name]: _removed, ...rest }) => rest);
    if (this.activeFile() === name) this.activeFile.set(this.lesson.value()?.entry ?? 'app.ts');
    this.save();
  }

  protected reset(lesson: Lesson): void {
    if (!confirm('Put this lesson back to how it started? Your changes to it will be lost.'))
      return;
    this.files.set(lesson.starter);
    this.tests.set(undefined);
    this.save();
  }

  /** Puts the files as this step leaves them in place; the checks run once the preview has. */
  protected solveStep(lesson: Lesson): void {
    const step = this.step();
    const question = `Replace your files with the solution to step ${step + 1}? Your changes to them will be lost.`;
    if (!confirm(question)) return;
    this.files.set(lesson.snapshots[step]!);
    this.tests.set(undefined);
    this.save();
  }

  protected async runTests(file: string): Promise<void> {
    this.tests.set(await (this.preview()?.test(file) ?? Promise.resolve([])));
  }

  protected onRan(result: RunResult): void {
    if (result.ok) void this.runChecks();
    else if (this.checkState() === 'done') this.checkState.set('stale');
  }

  protected jumpTo(problem: Problem): void {
    if (!problem.file || !(problem.file in this.files())) return;
    this.activeFile.set(problem.file);
    // After the editor has swapped to the file.
    setTimeout(() => this.editor()?.goTo(problem.line ?? 1, problem.column ?? 0));
  }

  private open(lesson: Lesson): void {
    const saved = this.progress.get(lesson.slug);
    this.files.set(saved?.files ?? lesson.starter);
    this.step.set(Math.min(saved?.step ?? 0, lesson.steps.length - 1));
    this.done.set(saved?.done ?? []);
    this.activeFile.set('app.ts');
    this.checks.set([]);
    this.checkState.set('waiting');
    this.tests.set(undefined);
    this.problems.set([]);
  }

  private async runChecks(): Promise<void> {
    const lesson = this.lesson.value();
    const preview = this.preview();
    if (!lesson || !preview) return;
    const run = ++this.checkRun;
    this.checkState.set('running');
    const outcomes = await preview.check(lesson.checks, this.step() + 1).catch(() => []);
    if (run !== this.checkRun) return;
    this.checks.set(outcomes);
    this.checkState.set('done');
    const steps = new Set(outcomes.map((outcome) => outcome.step - 1));
    const passed = [...steps].filter((step) =>
      outcomes.filter((outcome) => outcome.step - 1 === step).every((outcome) => outcome.ok),
    );
    this.done.update((done) => [
      ...new Set([...done.filter((step) => !steps.has(step)), ...passed]),
    ]);
    this.save();
  }

  private save(): void {
    const lesson = this.lesson.value();
    if (!lesson) return;
    this.progress.save(lesson.slug, { files: this.files(), step: this.step(), done: this.done() });
  }
}
