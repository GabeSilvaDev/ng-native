/**
 * The API reference, read out of the source rather than written beside it.
 *
 * Every component, directive, service and pipe in the workspace declares its surface with the
 * signal functions - `input()`, `input.required()`, `output()`, `model()` - and each one carries a
 * doc comment. That is a complete description of the public API sitting in the code already, and
 * the moment it is transcribed into markdown it starts drifting: an input gains an alias, a
 * default changes, a component is renamed, and the page still says the old thing with nothing to
 * notice. So the page does not say it. This reads the declarations at build time and the docs
 * render what it found.
 *
 * ## Syntactic, not typed
 *
 * Each file is parsed with `ts.createSourceFile` on its own - no `ts.Program`, no type checker, no
 * module resolution. That is a deliberate ceiling: a checker over fourteen packages costs seconds
 * per build and answers a question this does not ask. Everything here is written down in the
 * source already, because the signal API takes its type as an explicit argument
 * (`input<string>()`) or as a literal default (`input(false)`), and both are readable from the
 * syntax. Where a type is inferred from something non-literal, the type is reported as written -
 * `input(startOfMonth(new Date()))` reports its default as that expression, which is what a reader
 * wants to see anyway.
 *
 * The cost is that a type alias is not expanded: `input<CheckedState>()` says `CheckedState`, not
 * `boolean | 'indeterminate'`. Linking those is a job for a future pass; naming them is already
 * more than a hand-written table manages.
 */
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/** One `input()`, `output()` or `model()` on a class. */
export interface ApiMember {
  readonly name: string;
  /**
   * `signal` is a readonly signal property rather than one of Angular's binding functions.
   *
   * It is most of what a service *is*: `Battery` takes no inputs and raises no outputs, and its
   * whole surface is `level`, `low`, `state` and `charging`. Reporting only the binding functions
   * described every service in this workspace as having no API at all.
   */
  readonly kind: 'input' | 'output' | 'model' | 'signal';
  /** The name a template writes, when `alias` makes it differ from the property. */
  readonly alias?: string;
  readonly type: string;
  readonly default?: string;
  readonly required: boolean;
  readonly doc?: string;
}

/**
 * A directive composed onto a component's own host, and the members it forwards.
 *
 * `hostDirectives` is how most of this workspace is assembled: a styled button declares no
 * `disabled` input and raises no `press` output of its own, it composes `PressBehavior` and
 * forwards both. A reference that listed only a class's own members would say a button takes no
 * inputs and emits nothing, which is worse than saying nothing at all.
 */
export interface ApiHostDirective {
  readonly name: string;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
}

/** A public method worth calling from outside the class. */
export interface ApiMethod {
  readonly name: string;
  readonly signature: string;
  readonly doc?: string;
}

export interface ApiEntry {
  readonly name: string;
  /** `class` for a plain class an app constructs or is handed, such as `Permission`. */
  readonly kind: 'component' | 'directive' | 'service' | 'pipe' | 'class';
  readonly package: string;
  readonly file: string;
  /**
   * Where an app imports it from: the package itself when its root re-exports the class, or the
   * file's own entry point (`@ng-native/expo/battery`) when the package keeps it off the root
   * on purpose, so that importing one Expo module does not make an app install the rest.
   */
  readonly importPath: string;
  readonly selector?: string;
  /**
   * The class this one extends, by name.
   *
   * Most of `@ng-native/components` is built on `ViewBase`, which owns the forty-odd props
   * every native view takes, so a directive's own body frequently declares nothing at all. A
   * reference that stopped at the class it was handed would report `PressBehavior` as taking no
   * inputs, when it takes every one a view does.
   */
  readonly extends?: string;
  readonly doc?: string;
  readonly members: readonly ApiMember[];
  readonly methods: readonly ApiMethod[];
  readonly hostDirectives: readonly ApiHostDirective[];
}

const DECORATOR_KINDS: Record<string, ApiEntry['kind']> = {
  Component: 'component',
  Directive: 'directive',
  Service: 'service',
  Injectable: 'service',
  Pipe: 'pipe',
};

/** `.generated.ts` is AOT output of the file beside it; the rest are not shipped API. */
const SKIP = /\.(generated|spec|test)\.ts$/;

function docOf(node: ts.Node, source: ts.SourceFile): string | undefined {
  const ranges = ts.getLeadingCommentRanges(source.text, node.getFullStart()) ?? [];
  const block = ranges.filter((r) => source.text.slice(r.pos, r.pos + 3) === '/**').pop();
  if (!block) return undefined;
  return (
    source.text
      .slice(block.pos + 3, block.end - 2)
      .split('\n')
      .map((line) =>
        line
          .replace(/^\s*\*ic?/, '')
          .replace(/^\s*\* ?/, '')
          .trimEnd(),
      )
      .join('\n')
      .trim() || undefined
  );
}

/** The `selector` string out of a decorator's object literal. */
function propertyOf(call: ts.CallExpression, key: string): string | undefined {
  const [arg] = call.arguments;
  if (!arg || !ts.isObjectLiteralExpression(arg)) return undefined;
  for (const property of arg.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    if (property.name.getText() !== key) continue;
    const value = property.initializer;
    return ts.isStringLiteralLike(value) ? value.text : value.getText();
  }
  return undefined;
}

/**
 * An option out of a signal call's options object, wherever that argument happens to be.
 *
 * `input.required<T>({ alias })` puts it first and `input(default, { alias })` puts it second, so
 * scanning for the object literal is what reads both. Looking only at argument zero found the
 * alias on required inputs and missed it on every optional one, which is most of them.
 */
function optionOf(call: ts.CallExpression, key: string): string | undefined {
  for (const arg of call.arguments) {
    if (!ts.isObjectLiteralExpression(arg)) continue;
    for (const property of arg.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      if (property.name.getText() !== key) continue;
      const value = property.initializer;
      return ts.isStringLiteralLike(value) ? value.text : value.getText();
    }
  }
  return undefined;
}

/** The reactive factories a public readonly property can hold and still be part of the API. */
const SIGNAL_FACTORIES = new Set(['computed', 'signal', 'linkedSignal', 'toSignal', 'observed']);

/** `input`, `input.required`, `output`, `model`, `model.required` - or nothing. */
function signalCall(
  init: ts.Expression,
): { kind: ApiMember['kind']; required: boolean; call: ts.CallExpression } | undefined {
  if (!ts.isCallExpression(init)) return undefined;
  const target = init.expression;
  const [name, required] = ts.isPropertyAccessExpression(target)
    ? [target.expression.getText(), target.name.getText() === 'required']
    : [target.getText(), false];
  if (name === 'input' || name === 'output' || name === 'model') {
    return { kind: name, required, call: init };
  }
  // A readonly signal property: not a binding, but still something a caller reads.
  if (SIGNAL_FACTORIES.has(name)) return { kind: 'signal', required: false, call: init };
  return undefined;
}

/**
 * The type of a member, from the explicit type argument or from the literal default.
 *
 * `output<void>()` and `input<string>()` say it outright. `input(false)` and `input('')` do not,
 * and the literal is the only evidence there is - which is exactly what the compiler uses too.
 */
function typeOf(call: ts.CallExpression, kind: ApiMember['kind']): string {
  const [explicit] = call.typeArguments ?? [];
  if (explicit) return explicit.getText();
  const [first] = call.arguments;
  if (!first) return kind === 'output' ? 'void' : 'unknown';
  if (ts.isStringLiteralLike(first)) return 'string';
  if (first.kind === ts.SyntaxKind.TrueKeyword || first.kind === ts.SyntaxKind.FalseKeyword) {
    return 'boolean';
  }
  if (ts.isNumericLiteral(first)) return 'number';
  return 'unknown';
}

/**
 * Only what a template or a parent can reach.
 *
 * `private` and `protected` members are internals whatever they are initialised with, and a
 * `viewChild` is a query rather than a surface however public it is.
 */
function isPublic(node: ts.PropertyDeclaration | ts.MethodDeclaration): boolean {
  return !(node.modifiers ?? []).some(
    (m) => m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ProtectedKeyword,
  );
}

/**
 * The default, as written.
 *
 * A required input takes its options as the first argument and an optional one takes the default
 * there with the options second, so an object literal in that position is options rather than a
 * value. An explicit `undefined` is the absence of a default rather than a default of `undefined`.
 */
function defaultOf(call: ts.CallExpression, kind: ApiMember['kind'], required: boolean) {
  if (required || kind === 'output' || kind === 'signal') return undefined;
  const [first] = call.arguments;
  if (!first || ts.isObjectLiteralExpression(first)) return undefined;
  const written = first.getText();
  return written === 'undefined' ? undefined : written;
}

function memberOf(property: ts.PropertyDeclaration, source: ts.SourceFile): ApiMember | undefined {
  if (!isPublic(property) || !property.initializer) return undefined;
  const found = signalCall(property.initializer);
  if (!found) return undefined;

  const { kind, required, call } = found;
  const name = property.name.getText();
  /*
   * A signal property usually carries its type on the declaration - `readonly level: Signal<number>`
   * - which says more than the `computed()` call ever could. Where it does not, `typeOf` falls back
   * to reading the call, and an inferred `computed(() => ...)` reports `unknown`, which is honest.
   */
  if (kind === 'signal' && property.type) {
    const doc = docOf(property, source);
    return {
      name,
      kind,
      type: property.type.getText(),
      required: false,
      ...(doc ? { doc } : {}),
    };
  }
  const alias = optionOf(call, 'alias');
  const written = defaultOf(call, kind, required);
  const doc = docOf(property, source);

  return {
    name,
    kind,
    ...(alias && alias !== name ? { alias } : {}),
    type: typeOf(call, kind),
    ...(written ? { default: written } : {}),
    required,
    ...(doc ? { doc } : {}),
  };
}

function methodOf(method: ts.MethodDeclaration, source: ts.SourceFile): ApiMethod | undefined {
  if (!isPublic(method)) return undefined;
  const name = method.name.getText();
  // Lifecycle hooks are Angular calling the class, not the class offering anything.
  if (/^ng[A-Z]/.test(name)) return undefined;
  const doc = docOf(method, source);
  // Undocumented methods are usually incidental. The doc comment is the author saying it is API.
  if (!doc) return undefined;
  const parameters = method.parameters.map((p) => p.getText()).join(', ');
  const returns = method.type ? `: ${method.type.getText()}` : '';
  return { name, signature: `${name}(${parameters})${returns}`, doc };
}

/** The string entries of an array literal property, e.g. `inputs: ['disabled', 'hitSlop']`. */
function stringArrayOf(object: ts.ObjectLiteralExpression, key: string): string[] {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    if (property.name.getText() !== key) continue;
    if (!ts.isArrayLiteralExpression(property.initializer)) return [];
    return property.initializer.elements
      .filter(ts.isStringLiteralLike)
      .map((element) => element.text);
  }
  return [];
}

/**
 * The `hostDirectives` of a decorator, as names and forwarded members.
 *
 * A bare `hostDirectives: [PressBehavior]` forwards nothing, and an entry object names what it
 * forwards. Both spellings appear in this workspace.
 */
function hostDirectivesOf(decorator: ts.CallExpression): ApiHostDirective[] {
  const [arg] = decorator.arguments;
  if (!arg || !ts.isObjectLiteralExpression(arg)) return [];
  const property = arg.properties.find(
    (p): p is ts.PropertyAssignment =>
      ts.isPropertyAssignment(p) && p.name.getText() === 'hostDirectives',
  );
  if (!property || !ts.isArrayLiteralExpression(property.initializer)) return [];

  const out: ApiHostDirective[] = [];
  for (const element of property.initializer.elements) {
    if (ts.isObjectLiteralExpression(element)) {
      const directive = element.properties.find(
        (p): p is ts.PropertyAssignment =>
          ts.isPropertyAssignment(p) && p.name.getText() === 'directive',
      );
      if (!directive) continue;
      out.push({
        name: directive.initializer.getText(),
        inputs: stringArrayOf(element, 'inputs'),
        outputs: stringArrayOf(element, 'outputs'),
      });
    } else if (ts.isIdentifier(element)) {
      out.push({ name: element.text, inputs: [], outputs: [] });
    }
  }
  return out;
}

/**
 * A class that is a service without saying so in a decorator.
 *
 * Not everything injectable here carries `@Injectable`. `NativeNavigation` is a plain exported
 * class that calls `inject()` in its field initialisers and is provided by
 * `provideNativeRouter(routes)`, which is a perfectly ordinary shape and one the reference has to cover:
 * it is the API a page reaches for to push a screen. The test is `inject()` in the body plus
 * something public worth documenting, which is narrow enough to leave ordinary helper classes out.
 */
function isUndecoratedService(statement: ts.ClassDeclaration): boolean {
  return /\binject\(/.test(statement.getText());
}

/** The `@Component`/`@Directive`/`@Service`/`@Pipe` call on a class, if it has one. */
function decoratorOf(statement: ts.ClassDeclaration): ts.CallExpression | undefined {
  return ts
    .getDecorators(statement)
    ?.map((d) => d.expression)
    .find(
      (e): e is ts.CallExpression =>
        ts.isCallExpression(e) && e.expression.getText() in DECORATOR_KINDS,
    );
}

/** Every signal member and documented method on one class. */
function surfaceOf(statement: ts.ClassDeclaration, source: ts.SourceFile) {
  const members: ApiMember[] = [];
  const methods: ApiMethod[] = [];
  for (const member of statement.members) {
    if (ts.isPropertyDeclaration(member)) {
      const found = memberOf(member, source);
      if (found) members.push(found);
    } else if (ts.isMethodDeclaration(member)) {
      const found = methodOf(member, source);
      if (found) methods.push(found);
    }
  }
  return { members, methods };
}

/** Every documented declaration in one file. */
/**
 * Whether a class belongs in the reference at all, and as what.
 *
 * A decorated class is in on the strength of its decorator. An undecorated one is in only if it is
 * injectable and has something public to show, which keeps plain data classes and internal helpers
 * out while catching services like `NativeNavigation` that carry no decorator.
 */
function kindOfClass(
  statement: ts.ClassDeclaration,
  decorator: ts.CallExpression | undefined,
  surface: { members: readonly ApiMember[]; methods: readonly ApiMethod[] },
): ApiEntry['kind'] | undefined {
  if (decorator) return DECORATOR_KINDS[decorator.expression.getText()];
  if (!surface.members.length && !surface.methods.length) return undefined;
  return isUndecoratedService(statement) ? 'service' : 'class';
}

/** One exported class worth documenting, or nothing. */
function entryOf(
  statement: ts.Statement,
  source: ts.SourceFile,
  packageName: string,
  relative: string,
  importPath: string,
): ApiEntry | undefined {
  if (!ts.isClassDeclaration(statement) || !statement.name) return undefined;
  if (!statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) return undefined;

  const decorator = decoratorOf(statement);
  const surface = surfaceOf(statement, source);
  const kind = kindOfClass(statement, decorator, surface);
  if (!kind) return undefined;

  /*
   * The optional fields are assigned rather than spread in conditionally. This whole map is
   * serialised with `JSON.stringify` into the virtual module, and that drops an `undefined`
   * property on its own, so the guards would only be repeating what the serialiser already does.
   */
  return {
    name: statement.name.getText(),
    kind,
    package: packageName,
    file: relative,
    importPath,
    selector: decorator && propertyOf(decorator, 'selector'),
    extends: statement.heritageClauses
      ?.find((clause) => clause.token === ts.SyntaxKind.ExtendsKeyword)
      ?.types[0]?.expression.getText(),
    doc: docOf(statement, source),
    ...surface,
    hostDirectives: decorator ? hostDirectivesOf(decorator) : [],
  } as ApiEntry;
}

function entriesIn(
  file: string,
  packageName: string,
  relative: string,
  root: RootExports,
): ApiEntry[] {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  return source.statements
    .map((statement) => {
      const name = ts.isClassDeclaration(statement) ? statement.name?.getText() : undefined;
      const fromRoot = root.files.has(file) || (name !== undefined && root.names.has(name));
      const importPath =
        fromRoot || !root.subpaths ? packageName : `${packageName}/${path.basename(file)}`;
      return entryOf(statement, source, packageName, relative, importPath);
    })
    .filter((entry): entry is ApiEntry => entry !== undefined);
}

/** What a package's root import reaches: whole files re-exported, and names picked out of others. */
interface RootExports {
  readonly files: Set<string>;
  readonly names: Set<string>;
  /** Whether the package publishes its files as entry points of their own (`./*.ts`). */
  readonly subpaths: boolean;
}

/** Follows `export * from` and `export { a } from` out of `src/index.ts`, through any barrels. */
function rootExportsOf(packageDir: string): RootExports {
  const files = new Set<string>();
  const names = new Set<string>();
  const visit = (file: string): void => {
    if (files.has(file) || !fs.existsSync(file)) return;
    files.add(file);
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);
    for (const statement of source.statements) {
      if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier) continue;
      const target = path.resolve(
        path.dirname(file),
        (statement.moduleSpecifier as ts.StringLiteral).text,
      );
      const clause = statement.exportClause;
      if (!clause) visit(target);
      else if (ts.isNamedExports(clause)) {
        for (const element of clause.elements) names.add(element.name.text);
      }
    }
  };
  visit(path.join(packageDir, 'src/index.ts'));
  const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8')) as {
    exports?: Record<string, unknown>;
  };
  return { files, names, subpaths: Boolean(manifest.exports?.['./*.ts']) };
}

function walk(dir: string, into: string[]): string[] {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full, into);
    else if (item.name.endsWith('.ts') && !SKIP.test(item.name)) into.push(full);
  }
  return into;
}

/**
 * Every declaration in every package, keyed `@ng-native/components#Switch`.
 *
 * Keyed by package and name rather than by name alone because a name is not unique across the
 * workspace and never could be: a styled control built on `hostDirectives` can reasonably share
 * a name with the native element in `@ng-native/components` it composes, and both are real. A
 * page usually writes the bare name and `lookup` resolves it; where two packages share one, it
 * has to say which.
 */
export function extractApi(workspaceRoot: string): Record<string, ApiEntry> {
  const packages = path.join(workspaceRoot, 'packages');
  const out: Record<string, ApiEntry> = {};
  for (const item of fs.readdirSync(packages, { withFileTypes: true })) {
    if (!item.isDirectory() || item.name === 'integration-tests') continue;
    const src = path.join(packages, item.name, 'src');
    // A directory without a manifest is not a package, whatever is left in it.
    if (!fs.existsSync(src) || !fs.existsSync(path.join(packages, item.name, 'package.json'))) {
      continue;
    }
    const root = rootExportsOf(path.join(packages, item.name));
    for (const file of walk(src, [])) {
      for (const entry of entriesIn(
        file,
        `@ng-native/${item.name}`,
        path.relative(workspaceRoot, file),
        root,
      )) {
        out[`${entry.package}#${entry.name}`] = entry;
      }
    }
  }
  return out;
}

/**
 * One entry, by `Button` or by `@ng-native/components#Switch`.
 *
 * An ambiguous bare name throws rather than picking one, naming both candidates: a page that
 * silently documented the wrong `Switch` is the failure this whole file exists to avoid.
 */
export function lookup(api: Record<string, ApiEntry>, reference: string): ApiEntry {
  const exact = api[reference];
  if (exact) return exact;
  const matches = Object.values(api).filter((entry) => entry.name === reference);
  if (matches.length === 1) return matches[0]!;
  if (matches.length === 0) throw new Error(`No exported declaration named ${reference}`);
  throw new Error(
    `${reference} is declared in more than one package; write one of ` +
      matches.map((m) => `${m.package}#${m.name}`).join(', '),
  );
}

const MODULE = 'virtual:angular-native/api';

/**
 * Serves the extraction as a module the site imports.
 *
 * Rebuilt whenever a package source file changes, so the dev server shows an input added seconds
 * ago without a restart.
 */
export function api(workspaceRoot: string): Plugin {
  const resolved = `\0${MODULE}`;
  let cache: Record<string, ApiEntry> | undefined;

  return {
    name: 'documentation:api',
    resolveId: (id) => (id === MODULE ? resolved : undefined),
    load(id) {
      if (id !== resolved) return undefined;
      cache ??= extractApi(workspaceRoot);
      return `export const API = ${JSON.stringify(cache)};\nexport default API;\n`;
    },
    handleHotUpdate({ file, server }) {
      if (!file.includes(`${path.sep}packages${path.sep}`) || SKIP.test(file)) return;
      cache = undefined;
      const module = server.moduleGraph.getModuleById(resolved);
      if (module) server.moduleGraph.invalidateModule(module);
    },
  };
}
