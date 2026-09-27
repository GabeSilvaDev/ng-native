/**
 * A live example, and the reason this site is built the way it is.
 *
 * A component built from `@ng-native/components` cannot be put in an ordinary Angular
 * template. It renders element names no browser knows - `<view>`,
 * `<text>`, `<scroll-view>` - and it expects a `RendererFactory2` that commits them through
 * `BrowserEngine`, plus a `HostEngine` for anything that measures itself. Angular's DOM renderer
 * supplies neither, so the same template that draws a button on a phone would draw unknown
 * elements and no button here.
 *
 * `mount` builds an injector with exactly those overrides, which makes each example an island:
 * this component renders one empty `<div>` through Angular's DOM renderer, and hands it to
 * `mount` to become the root of a small, separate application with its own change detection.
 * The page around it stays a document. The two never share an injector, which is the honest shape
 * of the arrangement - `mount`'s own doc comment lists what it provides that a browser
 * application does not need and vice versa.
 *
 * The island's height is the example's own. `reset.css` gives `[data-rn-root]` `height: 100%`,
 * which is what makes `flex: 1` mean the screen in an app; here it resolves against the auto
 * height of the box below, so an example is as tall as its content unless it asks otherwise
 * through `height`.
 */
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  signal,
  viewChild,
  type OnDestroy,
  type Type,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { mount, type MountResult } from '@ng-native/web';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCode, lucideCopy, lucideEye } from '@ng-icons/lucide';

/** What `examples.ts` resolves a name to: the component, and the text that produced it. */
export interface LoadedExample {
  readonly component: Type<unknown>;
  /** The source, highlighted at build time by `build/source.ts`. */
  readonly source: string;
  /** The same source as plain text, for the copy button. */
  readonly text: string;
  /** An explicit height, for an example whose content cannot size itself (a scroll view). */
  readonly height?: number;
}

@Component({
  selector: 'doc-example',
  imports: [NgIcon],
  providers: [provideIcons({ lucideCheck, lucideCode, lucideCopy, lucideEye })],
  template: `
    <div class="not-prose overflow-hidden rounded-xl border border-border-default">
      <div
        class="flex items-center gap-1 border-b border-border-subtle bg-surface-raised px-2 py-1.5"
      >
        <div class="flex gap-0.5 rounded-lg bg-black/[0.04] p-0.5 dark:bg-white/[0.04]">
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              class="inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors"
              [class]="
                showing() === tab.id
                  ? 'bg-surface text-fg shadow-sm ring-1 ring-border-subtle'
                  : 'text-fg-tertiary hover:text-fg'
              "
              [attr.aria-pressed]="showing() === tab.id"
              (click)="show(tab.id)"
            >
              <ng-icon [name]="tab.icon" class="text-[13px]" />
              {{ tab.label }}
            </button>
          }
        </div>
        <button
          type="button"
          class="ml-auto inline-flex size-7 items-center justify-center rounded-md text-fg-tertiary transition-colors hover:bg-surface-sunken hover:text-fg"
          [attr.aria-label]="copied() ? 'Copied' : 'Copy the source'"
          (click)="copySource()"
        >
          <ng-icon [name]="copied() ? 'lucideCheck' : 'lucideCopy'" class="text-sm" />
        </button>
      </div>

      <!--
        Both panes stay in the DOM and one is hidden, rather than one being created on demand.
        Destroying the preview would destroy the island's application along with any state the
        reader had put into it, so switching to the source and back would silently reset the
        example - which is exactly the thing an interactive example exists to let them keep.
      -->
      <div
        class="flex min-h-40 items-center justify-center bg-surface p-8"
        [hidden]="showing() !== 'preview'"
      >
        <div #host class="w-full max-w-md" [style.height.px]="height()"></div>
      </div>
      <div class="bg-surface-code" [hidden]="showing() !== 'source'" [innerHTML]="source()"></div>
    </div>
  `,
  host: { class: 'block my-6' },
})
export class DocExample implements OnDestroy {
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly changes = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);

  /** The name from the markdown marker. */
  readonly name = input.required<string>();

  /** Resolved by the page from that name; see `examples.ts`. */
  readonly load = input.required<() => Promise<LoadedExample>>();

  protected readonly showing = signal<'preview' | 'source'>('preview');
  // Trusted rather than sanitised, because Shiki carries each token's two theme colours in a
  // `style` attribute and Angular's sanitiser strips those - which leaves a code block with the
  // right text and no highlighting at all. The HTML came from this repository's own files,
  // through this build.
  protected readonly source = signal<SafeHtml>('');
  protected readonly height = signal<number | undefined>(undefined);
  protected readonly copied = signal(false);
  protected readonly tabs = [
    { id: 'preview' as const, label: 'Preview', icon: 'lucideEye' },
    { id: 'source' as const, label: 'Source', icon: 'lucideCode' },
  ];

  private mounted?: MountResult;
  private text = '';

  constructor() {
    effect((onCleanup) => {
      const load = this.load();
      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });
      void load().then((example) => {
        if (cancelled) return;
        this.render(example);
      });
    });
  }

  ngOnDestroy(): void {
    this.unmount();
  }

  protected show(pane: 'preview' | 'source'): void {
    this.showing.set(pane);
  }

  protected copySource(): void {
    void navigator.clipboard?.writeText(this.text).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1600);
    });
  }

  private render(example: LoadedExample): void {
    this.unmount();
    this.source.set(this.sanitizer.bypassSecurityTrustHtml(example.source));
    this.height.set(example.height);
    this.text = example.text;
    const element = this.host().nativeElement;
    // `injectReset: false` because `styles.css` imports `reset.css` itself, into Tailwind's `base`
    // layer. The default here is to inject it as a bare `<style>`, and an unlayered rule beats
    // every layered one whatever its specificity - so the reset would win against the Tailwind
    // utility that was meant to override it.
    this.mounted = mount(element, example.component, { injectReset: false });
    this.changes.markForCheck();
  }

  private unmount(): void {
    this.mounted?.destroy();
    this.mounted = undefined;
  }
}
