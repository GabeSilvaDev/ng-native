/**
 * An example app's source: its files as a tree, and the one chosen, highlighted.
 *
 * The files and their highlighting come from `build/example-sources.ts`, read out of the app's
 * folder at build time. Each file is a chunk of its own, loaded when it is chosen.
 */
import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, resource } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { EXAMPLE_SOURCES } from 'virtual:angular-native/example-sources';
import { GITHUB_REPO } from '../site.ts';
import { fileTree } from './file-tree.ts';

@Component({
  selector: 'example-code-browser',
  imports: [NgTemplateOutlet],
  template: `
    <div
      class="grid overflow-hidden rounded-xl border border-border-subtle bg-surface-code lg:grid-cols-[14rem_minmax(0,1fr)]"
    >
      <nav
        aria-label="Files"
        class="max-h-56 overflow-auto border-b border-border-subtle py-3 lg:max-h-[42rem] lg:border-r lg:border-b-0"
      >
        <ng-container
          [ngTemplateOutlet]="level"
          [ngTemplateOutletContext]="{ nodes: tree(), depth: 0 }"
        />
      </nav>

      <div class="flex min-w-0 flex-col">
        <div
          class="flex h-11 items-center justify-between gap-4 border-b border-border-subtle px-4 text-[13px]"
        >
          <span class="truncate font-mono text-fg" data-file>{{ selected() }}</span>
          <a class="shrink-0 text-fg-tertiary transition-colors hover:text-fg" [href]="fileUrl()"
            >On GitHub</a
          >
        </div>
        <div
          class="code-pane min-h-80 overflow-auto lg:max-h-[39.25rem]"
          [attr.aria-busy]="code.isLoading()"
          [innerHTML]="html()"
        ></div>
      </div>
    </div>

    <ng-template #level let-nodes="nodes" let-depth="depth">
      <ul>
        @for (node of nodes; track node.path) {
          <li>
            @if (node.children) {
              <span
                class="flex h-7 items-center pr-3 font-mono text-[12.5px] text-fg-tertiary"
                [style.padding-left.rem]="1 + depth * 0.875"
                >{{ node.name }}/</span
              >
              <ng-container
                [ngTemplateOutlet]="level"
                [ngTemplateOutletContext]="{ nodes: node.children, depth: depth + 1 }"
              />
            } @else {
              <button
                type="button"
                class="relative flex h-7 w-full items-center pr-3 text-left font-mono text-[12.5px] transition-colors hover:text-fg"
                [class]="
                  node.path === selected()
                    ? 'bg-surface-raised font-medium text-fg before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-brand'
                    : 'text-fg-secondary'
                "
                [style.padding-left.rem]="1 + depth * 0.875"
                [attr.aria-current]="node.path === selected() ? 'true' : null"
                (click)="selected.set(node.path)"
              >
                {{ node.name }}
              </button>
            }
          </li>
        }
      </ul>
    </ng-template>
  `,
  styles: `
    /* The file fills the pane, so the block's own border and rounding would draw a box in a box. */
    .code-pane ::ng-deep .shiki {
      margin: 0;
      border: 0;
      border-radius: 0;
      padding: 1rem 1.25rem;
      overflow: visible;
    }
  `,
  host: { class: 'block' },
})
export class ExampleCodeBrowser {
  private readonly sanitizer = inject(DomSanitizer);

  readonly slug = input.required<string>();
  readonly sourceRoot = input.required<string>();
  /** The file to open on. */
  readonly entry = input.required<string>();

  protected readonly files = computed(() => EXAMPLE_SOURCES[this.slug()] ?? []);
  protected readonly tree = computed(() => fileTree(this.files().map((file) => file.path)));
  protected readonly selected = linkedSignal(() => this.entry());

  protected readonly code = resource({
    params: () => this.files().find((file) => file.path === this.selected()),
    loader: ({ params }) => params.load(),
  });

  /** The last file loaded, kept on screen while the next one arrives rather than a blank pane. */
  private readonly shown = linkedSignal<string | undefined, string>({
    source: () => this.code.value(),
    computation: (next, previous) => next ?? previous?.value ?? '',
  });

  /** Highlighted at build time from the repository's own file, so it is trusted as it is. */
  protected readonly html = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.shown()));

  protected readonly fileUrl = computed(
    () => `${GITHUB_REPO}/blob/main/${this.sourceRoot()}/${this.selected()}`,
  );
}
