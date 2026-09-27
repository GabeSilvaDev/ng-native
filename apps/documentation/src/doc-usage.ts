/**
 * The usage strip under a page's opening paragraph: what to import, from where, and what to write.
 *
 * Built from the page's own `<!-- api: -->` markers and the extracted API, never written by hand:
 * the import path is wherever the class is really published (the package root, or an entry point
 * such as `@ng-native/expo/battery`), the element is the component's own selector, and a
 * service shows the `inject()` that reaches it. Every page that documents a class gets the same
 * strip, and none of it can drift from the source.
 */
import { Component, computed, input, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCopy } from '@ng-icons/lucide';
import { API } from 'virtual:angular-native/api';
import type { ApiEntry } from '../build/api.ts';

/** `Button`, or `@ng-native/components#Switch`, the way an `api` marker names a class. */
export function findApi(reference: string): ApiEntry | undefined {
  const all = API as Record<string, ApiEntry>;
  return all[reference] ?? Object.values(all).find((item) => item.name === reference);
}

/** One import statement, wrapped the way Prettier would once it has more than three names. */
function importStatement(names: readonly string[], from: string): string {
  const list = names.length > 3 ? `\n  ${names.join(',\n  ')},\n` : ` ${names.join(', ')} `;
  return `import {${list}} from '${from}';`;
}

/** `<switch>` for an element selector, `[nativeRef]` for an attribute one. */
function usageOf(selector: string): string {
  const first = selector.split(',')[0]!.trim();
  return first.startsWith('[') ? first : `<${first}>`;
}

@Component({
  selector: 'doc-usage',
  imports: [NgIcon],
  providers: [provideIcons({ lucideCheck, lucideCopy })],
  template: `
    <div class="usage-row">
      <span class="usage-label">Import</span>
      <pre
        class="usage-code"
      ><code>@for (line of imports(); track line.from) {<span class="kw">import</span> {{ line.names }} <span class="kw">from</span> <span class="str">'{{ line.from }}'</span>;
}</code></pre>
      <button
        type="button"
        class="usage-copy"
        (click)="copy()"
        [attr.aria-label]="copied() ? 'Copied' : 'Copy the import'"
      >
        <ng-icon [name]="copied() ? 'lucideCheck' : 'lucideCopy'" size="15" />
      </button>
    </div>
    @if (elements().length) {
      <div class="usage-row">
        <span class="usage-label">Template</span>
        <div class="usage-uses">
          @for (element of elements(); track element) {
            <code>{{ element }}</code>
          }
          <span class="usage-note">
            once
            @if (declarables().length === 1) {
              <code>{{ declarables()[0] }}</code> is
            } @else {
              they are
            }
            in the component's <code>imports</code>
          </span>
        </div>
      </div>
    }
    @if (services().length) {
      <div class="usage-row">
        <span class="usage-label">Inject</span>
        <div class="usage-uses">
          @for (service of services(); track service) {
            <code>inject({{ service }})</code>
          }
        </div>
      </div>
    }
  `,
  host: { class: 'doc-usage' },
  styles: `
    :host {
      display: block;
      margin: 1.25rem 0 2rem;
      border: 1px solid var(--color-border-subtle);
      border-radius: 0.75rem;
      background: var(--color-paper-light);
      font-size: 0.8125rem;
    }
    .usage-row {
      display: grid;
      grid-template-columns: 5.5rem minmax(0, 1fr) auto;
      /* The label sits on the code's first line, however many lines the import runs to. */
      align-items: baseline;
      gap: 0.75rem;
      padding: 0.625rem 0.875rem;
    }
    .usage-row + .usage-row {
      border-top: 1px solid var(--color-border-subtle);
    }
    .usage-label {
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-fg-tertiary);
    }
    .usage-code {
      margin: 0;
      overflow-x: auto;
      font-family: var(--font-docs-mono);
      font-size: 0.8125rem;
      line-height: 1.6;
      color: var(--color-fg);
      background: none;
      white-space: pre;
    }
    .kw {
      color: var(--color-ng-red-ink);
    }
    .str {
      color: var(--color-fg-secondary);
    }
    .usage-copy {
      align-self: start;
      margin: -0.3rem 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.875rem;
      height: 1.875rem;
      border-radius: 0.375rem;
      color: var(--color-fg-tertiary);
      transition:
        color 150ms,
        background-color 150ms;
    }
    .usage-copy:hover {
      color: var(--color-fg);
      background: var(--color-surface-raised);
    }
    .usage-uses {
      grid-column: 2 / 4;
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.375rem 0.5rem;
    }
    .usage-uses code {
      font-family: var(--font-docs-mono);
      font-size: 0.8125rem;
      color: var(--color-fg);
    }
    .usage-note {
      color: var(--color-fg-tertiary);
    }
    .usage-note code {
      color: var(--color-fg-secondary);
    }
  `,
})
export class DocUsage {
  /** The page's `api` markers, in the order it documents them. */
  readonly references = input.required<readonly string[]>();

  protected readonly copied = signal(false);

  private readonly entries = computed(() =>
    this.references()
      .map(findApi)
      .filter((entry): entry is ApiEntry => entry !== undefined),
  );

  /** One statement per path, so an Expo page that uses two entry points shows both. */
  protected readonly imports = computed(() => {
    const byPath = new Map<string, string[]>();
    for (const entry of this.entries()) {
      const names = byPath.get(entry.importPath) ?? [];
      if (!names.includes(entry.name)) names.push(entry.name);
      byPath.set(entry.importPath, names);
    }
    return [...byPath].map(([from, names]) => ({
      from,
      names: importStatement(names, from).slice('import '.length).split(' from ')[0]!,
      text: importStatement(names, from),
    }));
  });

  private readonly declarable = computed(() =>
    this.entries().filter((entry) => entry.kind === 'component' || entry.kind === 'directive'),
  );

  protected readonly elements = computed(() =>
    this.declarable()
      .filter((entry) => entry.selector)
      .map((entry) => usageOf(entry.selector!)),
  );

  protected readonly declarables = computed(() => this.declarable().map((entry) => entry.name));

  protected readonly services = computed(() =>
    this.entries()
      .filter((entry) => entry.kind === 'service')
      .map((entry) => entry.name),
  );

  protected async copy(): Promise<void> {
    await navigator.clipboard.writeText(
      this.imports()
        .map((line) => line.text)
        .join('\n'),
    );
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}
