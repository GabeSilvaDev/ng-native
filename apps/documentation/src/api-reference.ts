/**
 * A declaration's API, as read out of its own source.
 *
 * Nothing here is written by hand. `build/api.ts` parses every package at build time and this
 * renders what it found: the selector, every `input()`, `output()` and `model()` with its type,
 * default and doc comment, and any public method whose author wrote one. A page asks for it with
 * `<!-- api: Button -->`.
 *
 * The upshot is that the reference cannot describe an API that no longer exists. The cost is that
 * an undocumented input shows up here as an undocumented input, which is the right pressure to
 * apply and the reason nothing invents a description to fill the gap.
 */
import { Component, computed, input } from '@angular/core';
import { API } from 'virtual:angular-native/api';
import { findApi } from './doc-usage.ts';
import type { ApiEntry, ApiMember } from '../build/api.ts';

/** The three member kinds, in the order a reader wants them. */
const ORDER: readonly ApiMember['kind'][] = ['input', 'model', 'output', 'signal'];

const LABELS: Record<ApiMember['kind'], string> = {
  input: 'Inputs',
  model: 'Two-way',
  output: 'Outputs',
  signal: 'Signals',
};

@Component({
  selector: 'api-reference',
  template: `
    @let found = entry();
    @if (found) {
      <div class="api">
        <div class="api-head">
          <code class="api-name">{{ found.selector ?? found.name }}</code>
          <span class="api-kind">{{ found.kind }}</span>
          <code class="api-package">{{ found.package }}</code>
        </div>
        <!-- The line to copy: which name, and from where, which the package name alone does not say. -->
        <div class="api-import">
          <code>{{ importLine(found) }}</code>
          @if (found.kind === 'component' || found.kind === 'directive') {
            <span
              >and add <code>{{ found.name }}</code> to the component's <code>imports</code></span
            >
          }
        </div>

        <!--
          The class's own summary, which is often the best sentence written about it anywhere and
          was being extracted and then thrown away. A page that has already introduced the class in
          prose repeats itself slightly; a page that reached for the table instead of writing an
          introduction gets one.
        -->
        @if (summary(found.doc)) {
          <p class="api-summary">
            @for (part of prose(found.doc); track $index) {
              @if (part.code) {
                <code>{{ part.text }}</code>
              } @else {
                {{ part.text }}
              }
            }
          </p>
        }

        @for (group of groups(); track group.label) {
          <h4 class="api-group">{{ group.label }}</h4>
          <div class="api-table">
            @for (member of group.members; track member.name) {
              <div class="api-row">
                <div class="api-cell-name">
                  <code>{{ member.alias ?? member.name }}</code>
                  @if (member.required) {
                    <span class="api-required">required</span>
                  }
                </div>
                <div class="api-cell-type">
                  <code>{{ member.type }}</code>
                  @if (member.default) {
                    <span class="api-default">&nbsp;= {{ member.default }}</span>
                  }
                </div>
                <p class="api-cell-doc">
                  @for (part of prose(member.doc); track $index) {
                    @if (part.code) {
                      <code>{{ part.text }}</code>
                    } @else {
                      {{ part.text }}
                    }
                  }
                </p>
              </div>
            }
          </div>
        }

        @for (group of composed(); track group.label) {
          <h4 class="api-group">{{ group.label }}</h4>
          <div class="api-table">
            @for (member of group.members; track member.name) {
              <div class="api-row">
                <div class="api-cell-name">
                  <code>{{ member.alias ?? member.name }}</code>
                  @if (member.required) {
                    <span class="api-required">required</span>
                  }
                </div>
                <div class="api-cell-type">
                  <code>{{ member.type }}</code>
                  @if (member.default) {
                    <span class="api-default">&nbsp;= {{ member.default }}</span>
                  }
                </div>
                <p class="api-cell-doc">
                  @for (part of prose(member.doc); track $index) {
                    @if (part.code) {
                      <code>{{ part.text }}</code>
                    } @else {
                      {{ part.text }}
                    }
                  }
                </p>
              </div>
            }
          </div>
        }

        @if (found.methods.length) {
          <h4 class="api-group">Methods</h4>
          <div class="api-table">
            @for (method of found.methods; track method.name) {
              <!-- A signature is a line of its own: squeezed into a column it ran over its doc. -->
              <div class="api-row api-row-method">
                <div class="api-cell-name">
                  <code>{{ method.signature }}</code>
                </div>
                <p class="api-cell-doc">
                  @for (part of prose(method.doc); track $index) {
                    @if (part.code) {
                      <code>{{ part.text }}</code>
                    } @else {
                      {{ part.text }}
                    }
                  }
                </p>
              </div>
            }
          </div>
        }

        @if (!groups().length && !found.methods.length) {
          <p class="api-empty">No public members.</p>
        }
      </div>
    } @else {
      <!--
        Loud rather than blank. A reference to a class that has been renamed is the exact drift
        this whole mechanism exists to catch, so it says so on the page instead of rendering
        nothing and looking like a section that was never written.
      -->
      <p class="api-missing">
        No declaration named <code>{{ reference() }}</code
        >.
      </p>
    }
  `,
  styles: `
    .api {
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      margin: 1.5rem 0;
    }
    .api-head {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: var(--muted);
      border-bottom: 1px solid var(--border);
    }
    .api-name {
      font-weight: 600;
    }
    .api-kind {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted-foreground);
    }
    .api-package {
      margin-left: auto;
      font-size: 0.8125rem;
      color: var(--muted-foreground);
    }
    .api-import {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.25rem 0.75rem;
      padding: 0.625rem 1rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.8125rem;
      color: var(--muted-foreground);
    }
    .api-import > code {
      color: var(--foreground);
    }
    .api-summary {
      margin: 0;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      color: var(--muted-foreground);
      font-size: 0.875rem;
      line-height: 1.6;
    }
    .api-group {
      margin: 0;
      padding: 0.75rem 1rem 0.25rem;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted-foreground);
    }
    .api-row {
      display: grid;
      grid-template-columns: minmax(8rem, 1fr) minmax(8rem, 1fr) minmax(0, 2fr);
      gap: 0.5rem 1rem;
      padding: 0.625rem 1rem;
      border-top: 1px solid var(--border);
      align-items: baseline;
    }
    .api-row-method {
      grid-template-columns: minmax(0, 1fr);
      gap: 0.25rem;
    }
    /* A long type or signature wraps inside its own cell rather than running into the next one. */
    .api-row > * {
      min-width: 0;
    }
    .api-cell-name code,
    .api-cell-type code {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    /* One column on a phone: three columns of two words each is not a table, it is confetti. */
    @media (max-width: 720px) {
      .api-row {
        grid-template-columns: 1fr;
        gap: 0.25rem;
      }
    }
    .api-required {
      margin-left: 0.5rem;
      font-size: 0.6875rem;
      text-transform: uppercase;
      color: var(--destructive);
    }
    .api-default {
      margin-left: 0.5rem;
      color: var(--muted-foreground);
      font-size: 0.8125rem;
    }
    .api-cell-doc {
      margin: 0;
      color: var(--muted-foreground);
      font-size: 0.875rem;
    }
    .api-empty,
    .api-missing {
      margin: 0;
      padding: 0.75rem 1rem;
      color: var(--muted-foreground);
      font-size: 0.875rem;
    }
  `,
})
export class ApiReference {
  /** `Button`, or `@ng-native/components#Switch` where two packages share a name. */
  readonly reference = input.required<string>();

  protected readonly entry = computed(() => findApi(this.reference()));

  /**
   * The first paragraph of a doc comment.
   *
   * These comments are written to be read in the editor and often run for pages - the reasoning
   * behind a decision, the bug that motivated it. A table wants the sentence that says what the
   * input is; anything longer belongs in the page's prose, where it can be edited for a reader
   * who is not looking at the file.
   */
  protected summary(doc: string | undefined): string {
    return (
      doc
        ?.split(/\n\s*\n/)[0]
        ?.replace(/\s+/g, ' ')
        .trim() ?? ''
    );
  }

  /** `import { Switch } from '@ng-native/components';`, from wherever the class is published. */
  protected importLine(entry: ApiEntry): string {
    return `import { ${entry.name} } from '${entry.importPath}';`;
  }

  /** The summary, split so that its `code` spans render as code rather than as backticks. */
  protected prose(doc: string | undefined): { text: string; code: boolean }[] {
    return this.summary(doc)
      .split('`')
      .map((text, index) => ({ text, code: index % 2 === 1 }))
      .filter((part) => part.text);
  }

  protected readonly groups = computed(() => {
    const found = this.entry();
    if (!found) return [];
    return ORDER.map((kind) => ({
      label: LABELS[kind],
      members: found.members.filter((member) => member.kind === kind),
    })).filter((group) => group.members.length > 0);
  });

  /**
   * What a host directive forwards, resolved against that directive's own declaration.
   *
   * Most of this workspace is assembled this way: a styled button declares no `disabled` input and
   * no `press` output, it composes `PressBehavior` and forwards both. A table of a class's own
   * members would say a button takes no inputs and emits nothing, so the forwarded names are
   * looked up where they are declared and listed under the directive that brings them.
   *
   * A name that resolves to nothing is still listed, with no type: the forwarding list is a list
   * of strings the compiler checks and this reference does not, so an entry that cannot be
   * resolved is more useful shown than silently dropped.
   */
  protected readonly composed = computed(() => {
    const found = this.entry();
    if (!found) return [];
    const all = Object.values(API as Record<string, ApiEntry>);
    const byName = (name: string) => all.find((item) => item.name === name);

    /** A class's own members plus everything it inherits, nearest declaration winning. */
    const inherited = (name: string | undefined): ApiMember[] => {
      const out: ApiMember[] = [];
      const seen = new Set<string>();
      for (
        let at = name ? byName(name) : undefined;
        at;
        at = at.extends ? byName(at.extends) : undefined
      ) {
        if (seen.has(at.name)) break;
        seen.add(at.name);
        out.push(...at.members);
      }
      return out;
    };

    return found.hostDirectives
      .map((host) => {
        const available = inherited(host.name);
        const named = [...host.inputs, ...host.outputs];
        const members = named.map<ApiMember>((name) => {
          const declared = available.find((m) => (m.alias ?? m.name) === name);
          return declared ?? { name, kind: 'input', type: 'unknown', required: false };
        });
        return { label: `From ${host.name}`, members };
      })
      .filter((group) => group.members.length > 0);
  });
}
