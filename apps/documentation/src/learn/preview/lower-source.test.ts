import { describe, expect, it } from 'vitest';
import { lowerSource, SourceProblem } from './lower-source.ts';

const lines = (text: string) => text.split('\n').length;

describe('lowerSource', () => {
  it('moves a class decorator in front of the class and applies it after', () => {
    const source = [
      "import { Component } from '@angular/core';",
      '@Component({',
      "  selector: 'app-root',",
      "  template: '<text>)</text>',",
      '})',
      'export class App {}',
    ].join('\n');
    const { code } = lowerSource(source);
    expect(code).toContain('const ɵlearnDecorator0 = Component({');
    expect(code).toContain('export class App {} ɵlearn.decorate(App, [ɵlearnDecorator0]);');
    expect(code).not.toContain('@Component');
    expect(lines(code)).toBe(lines(source));
  });

  it('applies several decorators in the order TypeScript does, nearest first', () => {
    const { code } = lowerSource('@A() @B() class X {}');
    expect(code).toContain('const ɵlearnDecorator0 = A(); const ɵlearnDecorator1 = B();');
    expect(code).toContain('ɵlearn.decorate(X, [ɵlearnDecorator0, ɵlearnDecorator1])');
  });

  it('names an anonymous default class so it can be decorated', () => {
    const { code } = lowerSource("@Component({ template: '' })\nexport default class {}");
    expect(code).toMatch(/export default class (ɵlearnAnonymous\d+) \{\} ɵlearn\.decorate\(\1,/);
  });

  it('writes metadata for signal inputs, models and outputs', () => {
    const source = [
      'class Row {',
      '  readonly name = input.required<string>();',
      "  readonly done = input(false, { alias: 'isDone' });",
      '  protected readonly value = model<number>(0);',
      '  readonly toggle = output<void>();',
      '  readonly plain = signal(1);',
      '  count = 0;',
      '}',
    ].join('\n');
    const { code } = lowerSource(source);
    expect(code).toContain(
      'ɵlearn.signals(Row, [["input", "name", true, null], ["input", "done", false, "isDone"], ' +
        '["model", "value", false, null], ["output", "toggle", false, null]]);',
    );
    expect(lines(code)).toBe(lines(source));
  });

  it('passes a query its locator and options as written', () => {
    const { code } = lowerSource(
      "class A { readonly box = viewChild.required<View>('box', { read: ElementRef }); readonly rows = viewChildren(Row); }",
    );
    expect(code).toContain(
      'ɵlearn.signals(A, [["viewChild", "box", true, [\'box\', { read: ElementRef }]], ["viewChildren", "rows", false, [Row]]]);',
    );
  });

  it('leaves alone a member that only looks like a signal member', () => {
    const { code } = lowerSource('class A { a = input; b = input(1) + 1; c = this.input(); }');
    expect(code).not.toContain('ɵlearn.signals');
  });

  it('applies a member decorator after the class, blanking it where it was', () => {
    const source =
      "class A {\n  @HostListener('press', ['$event'])\n  onPress() {}\n  @Input() static x = 1;\n}";
    const { code } = lowerSource(source);
    expect(code).toContain(
      `ɵlearn.member(A, "onPress", false, [HostListener('press', ['$event'])]);`,
    );
    expect(code).toContain('ɵlearn.member(A, "x", true, [Input()]);');
    expect(code).not.toContain('@');
    expect(lines(code)).toBe(lines(source));
  });

  it('guards while, do-while and three-part for loops, and not for-of', () => {
    const { code } = lowerSource(
      'while (a) {} do {} while (b); for (let i = 0; i < n; i++) {} for (;;) {} for (const x of xs) {}',
    );
    expect(code).toContain('while (ɵlearn.guard() && (a))');
    expect(code).toContain('while (ɵlearn.guard() && (b))');
    expect(code).toContain('for (let i = 0; ɵlearn.guard() && ( i < n); i++)');
    expect(code).toContain('for (; ɵlearn.guard();)');
    expect(code).toContain('for (const x of xs)');
  });

  it('is not confused by parentheses and braces inside strings and templates', () => {
    const source = [
      '@Component({',
      '  template: `',
      '    <text>{{ ")" }} while (x) {</text>',
      '  `,',
      "  styles: ['.a { color: red; }', `.b { color: blue; }`],",
      '})',
      'export class App {}',
    ].join('\n');
    const { code, templates, styles } = lowerSource(source);
    expect(code).toContain('<text>{{ ")" }} while (x) {</text>');
    expect(templates['App']).toEqual({ line: 2, column: 13 });
    expect(styles['App']?.css).toBe('.a { color: red; }\n.b { color: blue; }');
    expect(styles['App']?.at).toEqual({ line: 5, column: 12 });
  });

  it('reports a syntax error with its place in the file', () => {
    let problem: unknown;
    try {
      lowerSource('class A {\n  x = ;\n}');
    } catch (error) {
      problem = error;
    }
    expect(problem).toBeInstanceOf(SourceProblem);
    expect((problem as SourceProblem).at).toEqual({ line: 2, column: 6 });
  });

  it('asks for the decorator above export rather than after it', () => {
    expect(() => lowerSource("export @Component({ template: '' }) class A {}")).toThrow(
      /above "export"/,
    );
  });
});
