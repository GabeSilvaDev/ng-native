/**
 * A learner's TypeScript, rewritten so that a browser can run it and Angular's JIT compiler can
 * see everything the AOT compiler would.
 *
 * Three things need doing before sucrase strips the types, and all three are found from
 * sucrase's own tokens rather than by pattern-matching the text, so a brace in a template string
 * or a comment cannot throw them off:
 *
 * - **Decorators.** No browser runs them yet. `@Component({...}) export class App {}` becomes
 *   `const ɵlearnDecorator0 = Component({...}); export class App {}` followed by
 *   `ɵlearn.decorate(App, [ɵlearnDecorator0])`, which is what TypeScript's own lowering does,
 *   in the same order. A decorator on a member (`@HostListener`) is applied the same way.
 * - **Signal members.** The JIT compiler reads inputs, outputs and queries from decorator
 *   metadata, and `input()`, `model()`, `output()` and `viewChild()` are plain field initialisers
 *   it cannot see. The Angular CLI solves this with a TypeScript transform that writes the
 *   metadata in; this writes it as `ɵlearn.signals(App, [...])` after the class. Without it the
 *   first binding to a signal input fails with NG0950 or NG0303.
 * - **Loops.** A `while (true)` in a same-origin frame would freeze the whole page, editor and
 *   all, so every `while` and every three-part `for` asks `ɵlearn.guard()` before each pass, and
 *   the guard throws once a single task has looped for too long.
 *
 * Every edit keeps the line count: a removal is blanked rather than cut, and what is added goes
 * on an existing line. Sucrase keeps lines too, so a line in an error is a line in the editor.
 */
import { parse } from 'sucrase/dist/esm/parser/index.js';
import { IdentifierRole } from 'sucrase/dist/esm/parser/tokenizer/index.js';
import { TokenType as tt } from 'sucrase/dist/esm/parser/tokenizer/types.js';
import type { Token } from 'sucrase/dist/types/parser/tokenizer/index';

/** The name the rewritten code calls its helpers by. See `learn-runtime.ts`. */
export const RUNTIME = 'ɵlearn';

/** A place in the file: a 1-based line and a 0-based column, as CodeMirror and sucrase count. */
export interface SourceAt {
  readonly line: number;
  readonly column: number;
}

/** A component's inline stylesheet, and where its first character is in the file. */
export interface InlineStyles {
  readonly css: string;
  readonly at: SourceAt;
}

export interface LoweredSource {
  readonly code: string;
  /** Where each class's inline template starts, so a template error can name a line of the file. */
  readonly templates: Readonly<Record<string, SourceAt>>;
  readonly styles: Readonly<Record<string, InlineStyles>>;
}

/** A file this cannot rewrite, with where. Sucrase's own syntax errors arrive as one of these. */
export class SourceProblem extends Error {
  readonly at: SourceAt | undefined;

  constructor(message: string, at?: SourceAt) {
    super(message);
    this.at = at;
  }
}

const SIGNAL_MEMBERS = new Set([
  'input',
  'model',
  'output',
  'viewChild',
  'viewChildren',
  'contentChild',
  'contentChildren',
]);

interface Edit {
  readonly at: number;
  readonly end: number;
  readonly text: string;
}

interface ClassRange {
  readonly keyword: number;
  readonly open: number;
  readonly close: number;
  readonly contextId: number;
  readonly isExpression: boolean;
  name: string | undefined;
  readonly after: string[];
}

interface Rewrite {
  readonly source: string;
  readonly tokens: Token[];
  readonly edits: Edit[];
  readonly templates: Record<string, SourceAt>;
  readonly styles: Record<string, InlineStyles>;
  decorators: number;
}

export function lowerSource(source: string): LoweredSource {
  const rewrite: Rewrite = {
    source,
    tokens: tokenize(source),
    edits: [],
    templates: {},
    styles: {},
    decorators: 0,
  };
  const classes = findClasses(rewrite);
  lowerDecorators(rewrite, classes);
  for (const range of classes) collectSignalMembers(rewrite, range);
  guardLoops(rewrite);
  for (const range of classes) finishClass(rewrite, range);
  return {
    code: applyEdits(source, rewrite.edits),
    templates: rewrite.templates,
    styles: rewrite.styles,
  };
}

function tokenize(source: string): Token[] {
  try {
    return parse(source, false, true, false).tokens;
  } catch (error) {
    const { message, loc } = error as Error & { loc?: { line: number; column: number } };
    throw new SourceProblem(
      message.replace(/\s*\(\d+:\d+\)$/, ''),
      loc && { line: loc.line, column: loc.column - 1 },
    );
  }
}

export function positionOf(source: string, offset: number): SourceAt {
  const before = source.slice(0, offset);
  const line = before.split('\n').length;
  return { line, column: offset - (before.lastIndexOf('\n') + 1) };
}

const text = (rewrite: Rewrite, token: Token): string =>
  rewrite.source.slice(token.start, token.end);

const blank = (text: string): string => text.replace(/[^\n]/g, ' ');

const oneLine = (text: string): string => text.replace(/\s*\n\s*/g, ' ');

function matchParen(tokens: Token[], open: number): number {
  let depth = 0;
  for (let i = open; i < tokens.length; i++) {
    if (tokens[i]!.type === tt.parenL) depth++;
    else if (tokens[i]!.type === tt.parenR && --depth === 0) return i;
  }
  return tokens.length - 1;
}

function indexFrom(tokens: Token[], from: number, test: (token: Token) => boolean): number {
  for (let i = from; i < tokens.length; i++) if (test(tokens[i]!)) return i;
  return -1;
}

function findClasses(rewrite: Rewrite): ClassRange[] {
  const { tokens } = rewrite;
  const classes: ClassRange[] = [];
  tokens.forEach((token, keyword) => {
    if (token.type !== tt._class || token.contextId === null) return;
    const contextId = token.contextId;
    const open = indexFrom(
      tokens,
      keyword,
      (t) => t.type === tt.braceL && t.contextId === contextId,
    );
    const close = indexFrom(
      tokens,
      open + 1,
      (t) => t.type === tt.braceR && t.contextId === contextId,
    );
    const next = tokens[keyword + 1]!;
    const named = keyword + 1 < open && next.type === tt.name && !next.isType;
    classes.push({
      keyword,
      open,
      close,
      contextId,
      isExpression: token.isExpression,
      name: named ? text(rewrite, next) : undefined,
      after: [],
    });
  });
  return classes;
}

/** The token after a decorator: `@name`, `@a.b`, `@name(...)` or `@(expression)`. */
function decoratorEnd(tokens: Token[], at: number): number {
  let i = at + 1;
  if (tokens[i]?.type === tt.parenL) return matchParen(tokens, i) + 1;
  i++;
  while (tokens[i]?.type === tt.dot) i += 2;
  return tokens[i]?.type === tt.parenL ? matchParen(tokens, i) + 1 : i;
}

function lowerDecorators(rewrite: Rewrite, classes: ClassRange[]): void {
  const { tokens } = rewrite;
  const pending = new Map<ClassRange, string[]>();
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i]!.type !== tt.at) continue;
    const end = decoratorEnd(tokens, i);
    const owner = classes
      .filter((range) => range.open < i && i < range.close)
      .sort((a, b) => b.open - a.open)[0];
    if (owner) lowerMemberDecorator(rewrite, owner, i, end);
    else {
      const target = classes.find((range) => range.keyword > i);
      if (!target) throw new SourceProblem('A decorator needs a class after it.', at(rewrite, i));
      const names = pending.get(target) ?? [];
      names.push(lowerClassDecorator(rewrite, target, i, end));
      pending.set(target, names);
    }
    i = end - 1;
  }
  for (const [range, names] of pending) {
    nameClass(rewrite, range);
    range.after.push(`${RUNTIME}.decorate(${range.name}, [${names.join(', ')}]);`);
  }
}

const at = (rewrite: Rewrite, index: number): SourceAt =>
  positionOf(rewrite.source, rewrite.tokens[index]!.start);

function lowerClassDecorator(
  rewrite: Rewrite,
  range: ClassRange,
  start: number,
  end: number,
): string {
  const { tokens, source } = rewrite;
  const before = tokens[start - 1];
  if (before && (before.type === tt._export || before.type === tt._default)) {
    throw new SourceProblem('Put the decorator above "export", not after it.', at(rewrite, start));
  }
  const name = `${RUNTIME}Decorator${rewrite.decorators++}`;
  const expression = source.slice(tokens[start + 1]!.start, tokens[end - 1]!.end);
  rewrite.edits.push({
    at: tokens[start]!.start,
    end: tokens[end - 1]!.end,
    text: `const ${name} = ${expression};`,
  });
  recordInlineResources(rewrite, range, start, end);
  return name;
}

function lowerMemberDecorator(
  rewrite: Rewrite,
  range: ClassRange,
  start: number,
  end: number,
): void {
  const { tokens, source } = rewrite;
  const member = indexFrom(
    tokens,
    end,
    (t) => t.contextId === range.contextId && t.identifierRole === IdentifierRole.ObjectKey,
  );
  if (member === -1 || member > range.close) {
    throw new SourceProblem('A decorator needs a member after it.', at(rewrite, start));
  }
  const isStatic = tokens.slice(end, member).some((t) => t.type === tt._static);
  const expression = source.slice(tokens[start + 1]!.start, tokens[end - 1]!.end);
  const span = source.slice(tokens[start]!.start, tokens[end - 1]!.end);
  rewrite.edits.push({ at: tokens[start]!.start, end: tokens[end - 1]!.end, text: blank(span) });
  const field = JSON.stringify(text(rewrite, tokens[member]!).replace(/^['"]|['"]$/g, ''));
  nameClass(rewrite, range);
  range.after.push(
    `${RUNTIME}.member(${range.name}, ${field}, ${isStatic}, [${oneLine(expression)}]);`,
  );
}

/** A class with nothing to call it by gets a name, so the calls after it can refer to it. */
function nameClass(rewrite: Rewrite, range: ClassRange): void {
  if (range.name) return;
  range.name = `${RUNTIME}Anonymous${range.keyword}`;
  rewrite.edits.push({
    at: rewrite.tokens[range.keyword]!.end,
    end: rewrite.tokens[range.keyword]!.end,
    text: ` ${range.name}`,
  });
}

/** `template:` and `styles:` in `@Component({...})`, found for error positions and the CSS check. */
function recordInlineResources(
  rewrite: Rewrite,
  range: ClassRange,
  start: number,
  end: number,
): void {
  const { tokens } = rewrite;
  for (let i = start; i < end - 2; i++) {
    const key = tokens[i]!;
    if (key.identifierRole !== IdentifierRole.ObjectKey || tokens[i + 1]!.type !== tt.colon)
      continue;
    const name = text(rewrite, key);
    const strings = stringsAt(rewrite, i + 2);
    if (!strings.length || (name !== 'template' && name !== 'styles')) continue;
    nameClass(rewrite, range);
    const first = positionOf(rewrite.source, strings[0]!.start);
    if (name === 'template') rewrite.templates[range.name!] = first;
    else rewrite.styles[range.name!] = { css: strings.map((s) => s.text).join('\n'), at: first };
  }
}

/** The string or template literal at `i`, or each one in an array literal there. */
function stringsAt(rewrite: Rewrite, i: number): { start: number; text: string }[] {
  const { tokens, source } = rewrite;
  const one = (j: number) => {
    const token = tokens[j]!;
    if (token.type === tt.string)
      return { start: token.start + 1, text: text(rewrite, token).slice(1, -1) };
    if (token.type !== tt.backQuote || tokens[j + 1]?.type !== tt.template) return undefined;
    const body = tokens[j + 1]!;
    return { start: body.start, text: source.slice(body.start, body.end) };
  };
  if (tokens[i]?.type !== tt.bracketL) return [one(i)].filter((s) => s !== undefined);
  const found: { start: number; text: string }[] = [];
  for (let j = i + 1; j < tokens.length && tokens[j]!.type !== tt.bracketR; j++) {
    const string = one(j);
    if (string) found.push(string);
  }
  return found;
}

/** The tokens of a class field's initialiser, `[start, end)`, if the token at `i` names one. */
function initialiserOf(
  rewrite: Rewrite,
  range: ClassRange,
  i: number,
): [number, number] | undefined {
  const { tokens } = rewrite;
  const token = tokens[i]!;
  const isKey =
    token.contextId === range.contextId && token.identifierRole === IdentifierRole.ObjectKey;
  if (!isKey || token.type !== tt.name) return undefined;
  let j = i + 1;
  while (tokens[j]?.isType) j++;
  const eq = tokens[j];
  return eq?.type === tt.eq && eq.rhsEndIndex !== null ? [j + 1, eq.rhsEndIndex] : undefined;
}

function collectSignalMembers(rewrite: Rewrite, range: ClassRange): void {
  const members: string[] = [];
  for (let i = range.open + 1; i < range.close; i++) {
    const initialiser = initialiserOf(rewrite, range, i);
    if (!initialiser) continue;
    const member = signalMember(rewrite, text(rewrite, rewrite.tokens[i]!), ...initialiser);
    if (member) members.push(member);
  }
  if (!members.length || range.isExpression) return;
  nameClass(rewrite, range);
  range.after.push(`${RUNTIME}.signals(${range.name}, [${members.join(', ')}]);`);
}

/**
 * `input`, `input.required` or `viewChild<T>` followed by its call, as the whole initialiser:
 * the function, whether it is `.required`, and where its argument list opens.
 */
function signalCall(
  rewrite: Rewrite,
  start: number,
  end: number,
): { fn: string; required: boolean; open: number } | undefined {
  const { tokens } = rewrite;
  const fn = text(rewrite, tokens[start]!);
  if (tokens[start]!.type !== tt.name || !SIGNAL_MEMBERS.has(fn)) return undefined;
  let open = start + 1;
  const required = tokens[open]?.type === tt.dot && text(rewrite, tokens[open + 1]!) === 'required';
  if (required) open += 2;
  while (tokens[open]?.isType) open++;
  const whole = tokens[open]?.type === tt.parenL && matchParen(tokens, open) === end - 1;
  return whole ? { fn, required, open } : undefined;
}

/** `input.required<string>({ alias: 'x' })`, as the array `ɵlearn.signals` reads. */
function signalMember(
  rewrite: Rewrite,
  field: string,
  start: number,
  end: number,
): string | undefined {
  const call = signalCall(rewrite, start, end);
  if (!call) return undefined;
  const { tokens, source } = rewrite;
  const { fn, required, open } = call;
  const head = `${JSON.stringify(fn)}, ${JSON.stringify(field)}, ${required}`;
  if (fn === 'input' || fn === 'model' || fn === 'output') {
    return `[${head}, ${JSON.stringify(aliasIn(rewrite, open + 1, end - 1) ?? null)}]`;
  }
  const args =
    end - 1 > open + 1 ? source.slice(tokens[open + 1]!.start, tokens[end - 2]!.end) : '';
  return `[${head}, [${oneLine(args)}]]`;
}

function aliasIn(rewrite: Rewrite, start: number, end: number): string | undefined {
  const { tokens } = rewrite;
  for (let i = start; i < end - 2; i++) {
    const key = tokens[i]!;
    if (key.identifierRole !== IdentifierRole.ObjectKey || text(rewrite, key) !== 'alias') continue;
    const value = tokens[i + 2]!;
    if (tokens[i + 1]!.type === tt.colon && value.type === tt.string) {
      return text(rewrite, value).slice(1, -1);
    }
  }
  return undefined;
}

function guardLoops(rewrite: Rewrite): void {
  const { tokens, edits } = rewrite;
  const guard = `${RUNTIME}.guard()`;
  tokens.forEach((token, i) => {
    const open = tokens[i + 1];
    if (open?.type !== tt.parenL) return;
    const close = matchParen(tokens, i + 1);
    if (token.type === tt._while) {
      edits.push({ at: open.end, end: open.end, text: `${guard} && (` });
      edits.push({ at: tokens[close]!.start, end: tokens[close]!.start, text: ')' });
      return;
    }
    if (token.type !== tt._for) return;
    const semis = topLevelSemis(tokens, i + 1, close);
    if (semis.length !== 2) return;
    const [first, second] = semis as [number, number];
    if (second === first + 1) {
      edits.push({ at: tokens[first]!.end, end: tokens[first]!.end, text: ` ${guard}` });
      return;
    }
    edits.push({ at: tokens[first]!.end, end: tokens[first]!.end, text: ` ${guard} && (` });
    edits.push({ at: tokens[second]!.start, end: tokens[second]!.start, text: ')' });
  });
}

function topLevelSemis(tokens: Token[], open: number, close: number): number[] {
  const semis: number[] = [];
  let depth = 0;
  for (let i = open + 1; i < close; i++) {
    const type = tokens[i]!.type;
    if (type === tt.parenL || type === tt.braceL || type === tt.bracketL) depth++;
    else if (type === tt.parenR || type === tt.braceR || type === tt.bracketR) depth--;
    else if (type === tt.semi && depth === 0) semis.push(i);
  }
  return semis;
}

function finishClass(rewrite: Rewrite, range: ClassRange): void {
  if (!range.after.length) return;
  if (range.isExpression) {
    throw new SourceProblem(
      'Declare a decorated class with "class Name {}", not as an expression.',
      at(rewrite, range.keyword),
    );
  }
  const end = rewrite.tokens[range.close]!.end;
  rewrite.edits.push({ at: end, end, text: ` ${range.after.join(' ')}` });
}

function applyEdits(source: string, edits: Edit[]): string {
  const sorted = [...edits].sort((a, b) => a.at - b.at || a.end - b.end);
  let out = '';
  let from = 0;
  for (const edit of sorted) {
    out += source.slice(from, edit.at) + edit.text;
    from = Math.max(from, edit.end);
  }
  return out + source.slice(from);
}
