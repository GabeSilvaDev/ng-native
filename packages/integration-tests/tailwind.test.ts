/**
 * Tailwind's CSS, made into CSS this engine can compile.
 *
 * Tailwind emits for a browser: cascade layers, `@property`, feature detection, pseudo-element
 * resets, `oklch()` colours, and a spacing scale built out of `calc(var(--spacing) * n)`. None of
 * that survives contact with a renderer that has no CSS parser on device, so a build step flattens
 * it first. What it must *not* do is change what the declarations mean.
 *
 * The last test is the one that matters: real output from the Tailwind CLI, through the flattener,
 * through the engine's own compiler, asserting the styles a phone would actually get.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { StyleSheet } from '../fabric/src/css.ts';

const require = createRequire(import.meta.url);
const { flattenTailwind } = require('@ng-native/tailwind') as {
  flattenTailwind(css: string): string;
};
const { compileCss } = require('@ng-native/metro/css/compile.cjs') as {
  compileCss(
    source: string,
    context?: string,
    options?: { onUnsupported?: (message: string) => void },
  ): StyleSheet;
};

/** The declarations a class ends up with, as the engine would apply them. */
function stylesFor(css: string, className: string): Record<string, unknown> {
  const sheet = compileCss(flattenTailwind(css), 'tailwind', { onUnsupported: () => {} });
  const rule = sheet.rules.find((r) =>
    r.compounds.some((compound) => compound.classes.includes(className)),
  );
  return (rule?.declarations ?? {}) as Record<string, unknown>;
}

describe('flattening Tailwind for the engine', () => {
  it('unwraps cascade layers and drops the statement that orders them', () => {
    const out = flattenTailwind('@layer theme, utilities;\n@layer utilities { .a { flex: 1 } }');
    assert.doesNotMatch(out, /@layer/);
    assert.match(out, /\.a/);
  });

  it('unwraps feature detection, which is asking about a browser', () => {
    const out = flattenTailwind('@supports (color: red) { .a { flex: 1 } }');
    assert.doesNotMatch(out, /@supports/);
    assert.match(out, /\.a/);
  });

  it("keeps a @property's initial value, which is where a default comes from", () => {
    const css = `
      @property --tw-offset { syntax: "*"; initial-value: 12px }
      .a { margin-top: var(--tw-offset) }
    `;
    const out = flattenTailwind(css);
    assert.doesNotMatch(out, /@property/);
    assert.match(out, /margin-top:\s*12px/, 'the default was substituted, not dropped');
  });

  it('drops a per-side border style of solid, which native has no word for', () => {
    // React Native has one `borderStyle` for the whole box, and solid is already its default, so
    // Tailwind's `border-t` means its width and nothing else. Anything but solid is left for the
    // compiler to refuse out loud, because the app asked for something that cannot happen.
    const css = `
      @property --tw-border-style { syntax: "*"; initial-value: solid }
      .border-t { border-top-style: var(--tw-border-style); border-top-width: 1px }
    `;
    assert.deepEqual(stylesFor(css, 'border-t'), { borderTopWidth: 1 });
  });

  it('drops pseudo-element selectors and keeps the rest of the list', () => {
    const out = flattenTailwind('.a, ::before, .b { flex: 1 }');
    assert.doesNotMatch(out, /::before/);
    assert.match(out, /\.a/);
    assert.match(out, /\.b/);
  });

  it('drops a rule whose every selector was a pseudo-element', () => {
    const out = flattenTailwind('::before, ::after { content: "x" }\n.a { flex: 1 }');
    assert.doesNotMatch(out, /content/);
    assert.match(out, /\.a/);
  });

  it('resolves the theme variables and folds the arithmetic they were in', () => {
    // The spacing scale is the whole layout surface, and it is `calc(var(--spacing) * n)` for
    // every value of n. A device has no CSS parser, so this has to be a number by build time.
    const css = ':root { --spacing: 0.25rem } .p-4 { padding: calc(var(--spacing) * 4) }';
    assert.deepEqual(stylesFor(css, 'p-4'), {
      paddingTop: 16,
      paddingRight: 16,
      paddingBottom: 16,
      paddingLeft: 16,
    });
  });

  it('takes a fallback with commas of its own whole, rather than splitting it', () => {
    assert.match(flattenTailwind('.a { color: var(--missing, rgb(1, 2, 3)); }'), /color: #010203/);
  });

  it('lowers oklch, which native cannot parse', () => {
    const css = ':root { --c: oklch(62.3% 0.214 259.815) } .bg { background-color: var(--c) }';
    const { backgroundColor } = stylesFor(css, 'bg');
    assert.match(String(backgroundColor), /^rgb\(/, 'a colour native understands');
  });

  it('gives every palette colour the sRGB the compiler gives the same oklch()', () => {
    // Two converters disagreed. The flattener let lightningcss lower `oklch()`, which gamut-maps
    // by an older draft of CSS Color 4 and in single precision; the compiler converts it by the
    // current one. Most of the palette came out a step or more apart, and red-600 nine, so
    // `bg-red-600` and `color: var(--color-red-600)` in a component were different reds.
    const theme = readFileSync(require.resolve('tailwindcss/theme.css'), 'utf8');
    const palette = [...theme.matchAll(/(--color-[\w-]+):\s*(oklch\([^)]*\))/g)];
    assert.ok(palette.length > 200, 'the whole palette was read');
    const apart: string[] = [];
    for (const [, name, value] of palette) {
      const direct = compileCss(`.a { color: ${value} }`).rules[0]!.declarations['color'];
      const flattened = stylesFor(`.a { color: ${value} }`, 'a')['color'];
      if (direct !== flattened) apart.push(`${name}: ${String(flattened)}, not ${String(direct)}`);
    }
    assert.deepEqual(apart, []);
  });

  it('leaves the media range syntax alone, rather than lowering it into a "not" query', () => {
    // `fold()` targets Chrome 90 so it can fold calc(), and
    // that target used to lower everything else the way an old Chrome would too - including
    // Tailwind's own `(width < 500px)` breakpoint queries, which came out as `not (min-width:
    // 500px)`. The compiler refuses a `not` media query outright (see css-media.test.ts), so every
    // `max-*` breakpoint and container query compiled to nothing. compile.cjs's own `flatten()`
    // hit the same thing for nesting and fixed it by narrowing what gets lowered rather than
    // lowering for a target; this is the same fix for the other function that had it.
    const out = flattenTailwind('@media (width < 500px) { .max-sm\\:flex { display: flex } }');
    assert.doesNotMatch(out, /\bnot\s*\(/, 'the range syntax should reach the compiler as written');
    assert.match(out, /width\s*<\s*500px/);
  });

  it('leaves a themed token for the cascade rather than picking one of its values', () => {
    // A design system defines its palette twice: once under `:root` and once under `.dark`.
    // Substituting either one paints that palette in both themes, and the failure is invisible -
    // the app renders, in the wrong colours, with nothing in the bundle to say why. The engine
    // has a cascade and resolves `var()` per node, so the reference has to survive to it.
    const out = flattenTailwind(
      ':root { --primary: rgb(1, 1, 1) }\n' +
        '.dark { --primary: rgb(9, 9, 9) }\n' +
        '.bg { background-color: var(--primary) }',
    );
    assert.match(out, /background-color: var\(--primary\)/);
  });

  it('still substitutes a token that only ever has one value', () => {
    const out = flattenTailwind(
      ':root { --brand: rgb(1, 1, 1) }\n.bg { background-color: var(--brand) }',
    );
    assert.doesNotMatch(out, /var\(--brand\)/);
  });

  it('leaves a value the device supplies for the device to resolve', () => {
    // The safe-area insets are not knowable at build time and the fallback is not the answer:
    // collapsing `var(--safe-area-inset-bottom, 0px)` to `0px` here would be a layout that always
    // sits under the home indicator, with nothing to see in the output that says why.
    const out = flattenTailwind('.pb { padding-bottom: var(--safe-area-inset-bottom, 0px) }');
    assert.match(out, /var\(--safe-area-inset-bottom, 0px\)/);
  });

  it('keeps the arithmetic around one, folding everything but the unknown', () => {
    // `pb-safe-4` is `the inset, plus the padding this design wanted`. The spacing half folds at
    // build time; the inset half cannot, and the compiler understands the sum that is left.
    const css =
      ':root { --spacing: 0.25rem }\n' +
      '.pb { padding-bottom: calc(var(--safe-area-inset-bottom, 0px) + calc(var(--spacing) * 4)) }';
    const sheet = compileCss(flattenTailwind(css), 'tailwind', { onUnsupported: () => {} });
    const rule = sheet.rules.find((r) => r.compounds.some((c) => c.classes.includes('pb')));
    assert.deepEqual(rule?.deferred, [
      {
        props: ['paddingBottom'],
        kind: 'length',
        reference: '--safe-area-inset-bottom',
        adjust: { offset: 16 },
        fallback: 0,
      },
    ]);
  });

  it('rewrites a gradient composed out of custom properties into one with holes in it', () => {
    // Tailwind builds a gradient across three classes: one says which way it runs, one gives the
    // first colour, one gives the last. It joins them with `--tw-gradient-stops`, a *string* the
    // browser assembles at paint time - which needs a CSS parser exactly where there is none.
    // The stops go back where they came from, as references the cascade fills in per node.
    const out = flattenTailwind(
      '.bg-linear-to-r { --tw-gradient-position: to right in oklab; ' +
        'background-image: linear-gradient(var(--tw-gradient-stops)) }',
    );
    assert.match(out, /linear-gradient\(\s*to right,/, 'the direction, read off its own rule');
    assert.doesNotMatch(out, /--tw-gradient-stops/, 'the indirection is gone');
    assert.doesNotMatch(out, /oklab/, 'an interpolation space native has no say in');
    assert.match(out, /var\(--tw-gradient-from\)/);
    assert.match(out, /var\(--tw-gradient-via\)/, 'the optional middle, dropped if unset');
    assert.match(out, /var\(--tw-gradient-to\)/);
  });

  it('keeps a stop position as a reference, with its declared default as the fallback', () => {
    const out = flattenTailwind(
      '@property --tw-gradient-from-position { syntax: "*"; initial-value: 0% }\n' +
        '.bg-linear-to-r { --tw-gradient-position: to right; ' +
        'background-image: linear-gradient(var(--tw-gradient-stops)) }',
    );
    // `from-20%` sets this from a different rule, so it cannot be substituted here - but the
    // @property default is what a sheet that never sets it should paint.
    assert.match(out, /var\(--tw-gradient-from-position,\s*0%\)/);
  });

  it('reads a custom property from the rule that declared it, not from the reset', () => {
    // Tailwind's shadows, rings and filters all work this way: a `*` reset gives every property a
    // no-op default, and the utility that needs one sets it in the same rule that reads it. Taking
    // the last value written in the file means taking the reset every time, and the utility does
    // nothing at all - which is what shadows did until this.
    const out = flattenTailwind(
      '.shadow-lg { --tw-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); box-shadow: var(--tw-shadow) }\n' +
        '* { --tw-shadow: 0 0 #0000 }',
    );
    assert.match(out, /box-shadow:\s*0 10px 15px -3px/, 'the rule that reads it declared it');
  });

  it('falls back when a custom property was reset to `initial`', () => {
    // `--tw-shadow-color: initial` is how Tailwind says "nobody has set a shadow colour". A
    // custom property holding `initial` is guaranteed-invalid, so `var()` takes its fallback -
    // and substituting the word itself is how a shadow ended up coloured `initial`.
    const out = flattenTailwind(
      '* { --tw-shadow-color: initial }\n' +
        '.shadow { box-shadow: 0 1px 2px var(--tw-shadow-color, rgb(0 0 0 / 0.1)) }',
    );
    assert.match(out, /box-shadow:\s*0 1px 2px #0000001a/, 'the fallback colour, not the word');
  });

  it('leaves a plain rule alone', () => {
    const out = flattenTailwind('.a { flex: 1; background-color: #fff }');
    assert.match(out, /flex:\s*1/);
    assert.match(out, /#fff/i);
  });
});

describe('real Tailwind output, end to end', () => {
  const css = readFileSync(
    fileURLToPath(new URL('./fixtures/tailwind-utilities.css', import.meta.url)),
    'utf8',
  );

  it('compiles the utilities a screen is built from', () => {
    const styles = (className: string) => stylesFor(css, className);

    assert.deepEqual(styles('p-4'), {
      paddingTop: 16,
      paddingRight: 16,
      paddingBottom: 16,
      paddingLeft: 16,
    });
    assert.deepEqual(styles('gap-2'), { rowGap: 8, columnGap: 8 });
    assert.deepEqual(styles('h-16'), { height: 64 });
    assert.deepEqual(styles('flex-row'), { flexDirection: 'row' });
    assert.deepEqual(styles('items-center'), { alignItems: 'center' });
    assert.deepEqual(styles('justify-between'), { justifyContent: 'space-between' });
    assert.equal(styles('bg-blue-500')['backgroundColor'], 'rgb(43, 127, 255)');
    assert.equal(styles('rounded-lg')['borderTopLeftRadius'], 8);
  });

  it('gets the type scale, which Tailwind hides behind a unitless calc', () => {
    // `--text-lg--line-height: calc(1.75 / 1.125)` - a ratio, in a custom property, referenced
    // from the utility. Nothing about that survives to a device unless it is folded here.
    const lg = stylesFor(css, 'text-lg');
    assert.equal(lg['fontSize'], 18);
    assert.equal(typeof lg['lineHeight'], 'number');
  });

  it('compiles a real shadow utility to a shadow native can paint', () => {
    const shadow = stylesFor(css, 'shadow-lg')['boxShadow'] as
      { color: string; offsetY: number; blurRadius: number }[] | undefined;
    assert.ok(shadow?.length, 'shadow-lg should paint something');
    assert.equal(shadow[0]!.offsetY, 10);
    assert.equal(shadow[0]!.blurRadius, 15);
    assert.match(shadow[0]!.color, /^rgba?\(/, 'a colour, not the word initial');
  });

  it('drops the fully transparent placeholders from a shadow chain', () => {
    // `box-shadow` composes five slots - inset, inset ring, ring offset, ring, shadow - and four
    // of them are `0 0 #0000` on anything that only wanted a drop shadow. They paint nothing, and
    // sending four extra shadow maps per node to paint nothing is worth not doing.
    const shadow = stylesFor(css, 'shadow-lg')['boxShadow'] as unknown[];
    assert.equal(shadow.length, 2, 'the two the utility actually declared');
  });

  it('drops a utility it cannot express instead of failing the build', () => {
    // Tailwind generates from a scan of anything that looks like a class name - comments and
    // string literals included - so a comment listing classes that are not supported generates
    // them. Each one is dropped with a warning, as in a component's own stylesheet.
    const refused: string[] = [];
    const sheet = compileCss(
      '.a { color: red } .b:has(> .c) { color: blue } .d { color: green }',
      'tw',
      {
        onUnsupported: (message: string) => refused.push(message),
      },
    );
    assert.equal(sheet.rules.length, 2, 'the two it could express');
    assert.match(refused.join(''), /:has/);
  });

  it('compiles the whole sheet without the compiler refusing any of it', () => {
    const refused: string[] = [];
    const sheet = compileCss(flattenTailwind(css), 'tailwind', {
      onUnsupported: (message) => refused.push(message),
    });
    assert.ok(sheet.rules.length > 20, `expected a sheet, got ${sheet.rules.length} rules`);
    const real = refused.filter((message) => !message.includes("dropped '--"));
    assert.deepEqual(real, [], 'nothing but leftover custom properties should be dropped');
  });
  it('drops a filter utility iOS does not draw, and keeps it behind android:', () => {
    // The shape Tailwind 4.3 writes for grayscale and android:grayscale: every filter utility sets
    // its own slot and reads all nine, and a reset empties the slots nobody set. brightness-50 is
    // drawn on both platforms and stays.
    const slots = ['blur', 'brightness', 'contrast', 'grayscale', 'hue-rotate', 'invert'];
    const reset = `*, ::before { ${slots.map((slot) => `--tw-${slot}: initial;`).join(' ')} }\n`;
    const filters =
      'var(--tw-blur,) var(--tw-brightness,) var(--tw-contrast,) var(--tw-grayscale,) ' +
      'var(--tw-hue-rotate,) var(--tw-invert,) var(--tw-saturate,) var(--tw-sepia,) ' +
      'var(--tw-drop-shadow,)';
    const css =
      `.grayscale { --tw-grayscale: grayscale(100%); filter: ${filters}; }\n` +
      `.platform-android .android\\:grayscale { --tw-grayscale: grayscale(100%); filter: ${filters}; }\n` +
      `.brightness-50 { --tw-brightness: brightness(50%); filter: ${filters}; }\n` +
      reset;
    const refused: string[] = [];
    const sheet = compileCss(flattenTailwind(css), 'tailwind', {
      onUnsupported: (message: string) => refused.push(message),
    });
    const filterOf = (className: string) =>
      sheet.rules.find((rule) => rule.compounds.some((c) => c.classes.includes(className)))
        ?.declarations['filter'];

    assert.equal(filterOf('grayscale'), undefined, 'dropped');
    assert.match(refused.join('\n'), /dropped 'filter'.*grayscale\(\) is not drawn on iOS/);
    assert.deepEqual(filterOf('android:grayscale'), [{ grayscale: 1 }]);
    assert.deepEqual(filterOf('brightness-50'), [{ brightness: 0.5 }]);
  });

  it('keeps a stacked variant, whose root classes may sit on one node', () => {
    // `android:dark:` compiles to `.dark :is(.platform-android .x)`. A combinator inside `:is()`
    // is a build error for the engine, so the rule used to be dropped: every stacked platform and
    // dark variant silently did nothing. It is the same match as either ancestor order, or both
    // classes on one ancestor - which is where \`mount\` and \`watchConditions\` put them.
    const refused: string[] = [];
    const css = '.dark :is(.platform-android .x) { background-color: rgb(1, 2, 3) }';
    const sheet = compileCss(flattenTailwind(css), 'tailwind', {
      onUnsupported: (message: string) => refused.push(message),
    });
    assert.deepEqual(refused, []);
    const shapes = sheet.rules.map((rule) =>
      rule.compounds.map((c) => c.classes.join('.')).join(' '),
    );
    assert.deepEqual(shapes.sort(), [
      'dark platform-android x',
      'dark.platform-android x',
      'platform-android dark x',
    ]);
  });

  it('keeps a stacked variant that also carries a same-node pseudo, like ios:dark:press:', () => {
    // `ios:dark:press:bg-red-500` compiles to `.dark :is(.platform-ios .x):active` - the same
    // two-ancestor `:is()` as above, but with `:active` trailing the closing paren rather than
    // nothing. The regex that expands the ancestor form only matched a selector that ended at
    // the paren, so this shape slipped past it unexpanded and the compiler refused the whole
    // rule as a combinator inside `:is()` - every class stacking a platform or dark variant with
    // a pressed, hovered, focused or disabled one compiled to nothing, on both platforms.
    const refused: string[] = [];
    const css = '.dark :is(.platform-ios .x):active { background-color: rgb(1, 2, 3) }';
    const sheet = compileCss(flattenTailwind(css), 'tailwind', {
      onUnsupported: (message: string) => refused.push(message),
    });
    assert.deepEqual(refused, []);
    const shapes = sheet.rules.map((rule) =>
      rule.compounds.map((c) => c.classes.join('.')).join(' '),
    );
    assert.deepEqual(shapes.sort(), [
      'dark platform-ios x',
      'dark.platform-ios x',
      'platform-ios dark x',
    ]);
    // The pseudo has to survive the expansion, not just the class list.
    for (const rule of sheet.rules) {
      assert.deepEqual(rule.compounds.at(-1)!.pseudo, ['active']);
    }
  });
});
