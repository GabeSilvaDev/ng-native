/**
 * The editor: CodeMirror, one state per file so each keeps its own undo history, with the
 * problems the preview found marked on the lines they came from.
 *
 * TypeScript, with a component's `template:` highlighted as an Angular template and its
 * `styles:` as CSS, which is how a learner reads them.
 */
import {
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  untracked,
  type OnDestroy,
} from '@angular/core';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { angularLanguage } from '@codemirror/lang-angular';
import { cssLanguage } from '@codemirror/lang-css';
import { typescriptLanguage } from '@codemirror/lang-javascript';
import {
  bracketMatching,
  HighlightStyle,
  indentOnInput,
  indentUnit,
  LanguageSupport,
  syntaxHighlighting,
} from '@codemirror/language';
import { lintGutter, setDiagnostics, type Diagnostic } from '@codemirror/lint';
import { EditorState, type Extension } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { parseMixed, type SyntaxNodeRef } from '@lezer/common';
import { tags } from '@lezer/highlight';
import type { Problem } from './protocol.ts';

/** `template:` as Angular, `styles:` as CSS, inside a component's decorator. */
function nested(node: SyntaxNodeRef, input: { read(from: number, to: number): string }) {
  if (node.name !== 'TemplateString') return null;
  const key = node.node.parent?.firstChild;
  if (!key || key.name !== 'PropertyDefinition') return null;
  const name = input.read(key.from, key.to);
  const parser =
    name === 'template' ? angularLanguage.parser : name === 'styles' ? cssLanguage.parser : null;
  return parser && node.to - node.from > 2
    ? { parser, overlay: [{ from: node.from + 1, to: node.to - 1 }] }
    : null;
}

const language = new LanguageSupport(
  typescriptLanguage.configure({ wrap: parseMixed(nested) }, 'angular-component'),
);

/** Colours from the site's own `--code-*` tokens, which follow its light and dark themes. */
const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.modifier, tags.controlKeyword], color: 'var(--code-keyword)' },
  { tag: [tags.string, tags.special(tags.string)], color: 'var(--code-string)' },
  { tag: [tags.number, tags.bool, tags.null], color: 'var(--code-number)' },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: 'var(--code-comment)' },
  { tag: [tags.typeName, tags.className, tags.namespace], color: 'var(--code-type)' },
  {
    tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
    color: 'var(--code-function)',
  },
  { tag: [tags.tagName, tags.angleBracket], color: 'var(--code-tag)' },
  { tag: [tags.attributeName, tags.propertyName], color: 'var(--code-attribute)' },
  { tag: [tags.meta, tags.processingInstruction], color: 'var(--code-keyword)' },
]);

const theme = EditorView.theme({
  '&': { height: '100%', fontSize: '13px', backgroundColor: 'var(--surface-code)' },
  '.cm-scroller': { fontFamily: 'var(--font-docs-mono)', lineHeight: '1.6' },
  '.cm-content': { caretColor: 'var(--fg-primary)', color: 'var(--fg-primary)' },
  '.cm-gutters': {
    backgroundColor: 'var(--surface-code)',
    color: 'var(--fg-quaternary)',
    border: 'none',
  },
  // Translucent on the line itself: CodeMirror draws the selection behind the text, so an opaque
  // active line hid any selection made within the line being edited.
  '.cm-activeLine': {
    backgroundColor: 'color-mix(in srgb, var(--fg-primary) 4%, transparent)',
  },
  '.cm-activeLineGutter': { backgroundColor: 'var(--surface-raised)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'color-mix(in srgb, var(--brand) 30%, transparent) !important',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-cursor': { borderLeftColor: 'var(--fg-primary)' },
  '.cm-tooltip': {
    backgroundColor: 'var(--surface-page)',
    border: '1px solid var(--border-default)',
    color: 'var(--fg-primary)',
  },
});

const EXTENSIONS: Extension[] = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightActiveLine(),
  drawSelection(),
  history(),
  indentOnInput(),
  bracketMatching(),
  closeBrackets(),
  indentUnit.of('  '),
  EditorState.tabSize.of(2),
  keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
  language,
  syntaxHighlighting(highlight),
  lintGutter(),
  theme,
];

/** A problem as CodeMirror marks it: the rest of the line from its column. */
export function diagnosticFor(state: EditorState, problem: Problem): Diagnostic | undefined {
  if (!problem.line || problem.line > state.doc.lines) return undefined;
  const line = state.doc.line(problem.line);
  const from = Math.min(line.from + (problem.column ?? 0), line.to);
  return {
    from,
    to: Math.max(from, line.to),
    severity: problem.kind === 'css' ? 'warning' : 'error',
    message: problem.message,
  };
}

@Component({
  selector: 'learn-code-editor',
  host: { class: 'block h-full min-h-0 overflow-hidden' },
  template: '',
})
export class CodeEditor implements OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Every file, by name. A change from outside, such as a reset, replaces the file's text. */
  readonly files = input.required<Readonly<Record<string, string>>>();
  readonly file = input.required<string>();
  readonly problems = input<readonly Problem[]>([]);
  readonly edited = output<{ file: string; text: string }>();

  private readonly states = new Map<string, EditorState>();
  private readonly view: EditorView;
  private showing = '';

  constructor() {
    this.view = new EditorView({
      parent: this.host.nativeElement,
      dispatch: (transaction, view) => {
        view.update([transaction]);
        this.states.set(this.showing, view.state);
        if (transaction.docChanged) {
          this.edited.emit({ file: this.showing, text: view.state.doc.toString() });
        }
      },
    });
    effect(() => this.show(this.file(), this.files()));
    effect(() => this.mark(this.problems(), this.file()));
  }

  /** Put the cursor on a line of the file on screen. */
  goTo(line: number, column = 0): void {
    const doc = this.view.state.doc;
    if (line < 1 || line > doc.lines) return;
    const at = Math.min(doc.line(line).from + column, doc.line(line).to);
    this.view.dispatch({ selection: { anchor: at }, scrollIntoView: true });
    this.view.focus();
  }

  ngOnDestroy(): void {
    this.view.destroy();
  }

  private stateFor(file: string, text: string): EditorState {
    const existing = this.states.get(file);
    if (existing && existing.doc.toString() === text) return existing;
    const state = EditorState.create({ doc: text, extensions: EXTENSIONS });
    this.states.set(file, state);
    return state;
  }

  private show(file: string, files: Readonly<Record<string, string>>): void {
    const text = files[file] ?? '';
    const current = file === this.showing ? this.view.state : undefined;
    if (current && current.doc.toString() === text) return;
    this.showing = file;
    this.view.setState(this.stateFor(file, text));
    untracked(() => this.mark(this.problems(), file));
  }

  private mark(problems: readonly Problem[], file: string): void {
    const diagnostics = problems
      .filter((problem) => problem.file === file)
      .map((problem) => diagnosticFor(this.view.state, problem))
      .filter((diagnostic) => diagnostic !== undefined);
    this.view.dispatch(setDiagnostics(this.view.state, diagnostics));
  }
}
