/**
 * Tailwind's CSS, made into CSS the engine's compiler accepts.
 *
 * Tailwind 4 emits for a browser, and most of what it emits is about being one: cascade layers,
 * `@property` declarations, feature detection, pseudo-element resets, `oklch()` colours, and a
 * spacing scale expressed as `calc(var(--spacing) * n)`. This turns that into the subset a
 * renderer with no CSS parser on device can compile, without changing what any declaration means.
 *
 * The rule of thumb throughout: **anything that is only a browser question is answered here**, at
 * build time, and anything that is a real cascade question is left for the engine, which has a
 * cascade. That is the whole difference from NativeWind, which has to rebuild one.
 *
 * Import `tailwindcss/theme.css` and `tailwindcss/utilities.css` rather than `tailwindcss`, and
 * preflight never arrives - it is `html`, `::before` and `-webkit-*` from end to end. This copes
 * if it does arrive, by dropping what it cannot express, but the warnings are noise nobody needs.
 */
const { transform, Features } = require('lightningcss');

/** `@layer a, b;` - the statement that orders layers, which is meaningless once they are gone. */
const LAYER_STATEMENT = /@layer\s+[^;{]+;/g;

/**
 * Remove an at-rule and everything inside it, or unwrap it and keep its contents.
 *
 * Written by hand rather than with a regex because the bodies nest: `@supports` holds rules, and
 * `@layer` holds `@supports`. Brace counting is the whole of it.
 */
function rewriteAtRule(css, prelude, keepBody) {
  let out = css;
  for (let at = out.indexOf(prelude); at !== -1; at = out.indexOf(prelude, at)) {
    const open = out.indexOf('{', at);
    if (open === -1) break;
    let depth = 0;
    let close = -1;
    for (let i = open; i < out.length; i++) {
      if (out[i] === '{') depth++;
      else if (out[i] === '}' && --depth === 0) {
        close = i;
        break;
      }
    }
    if (close === -1) break;
    const body = keepBody ? out.slice(open + 1, close) : '';
    out = out.slice(0, at) + body + out.slice(close + 1);
  }
  return out;
}

/**
 * The custom properties a sheet declares, and what they resolve to.
 *
 * Two sources: ordinary declarations, wherever they appear, and `@property`'s `initial-value`,
 * which is how Tailwind gives `--tw-border-style` a default of `solid` on the web. Both are
 * static by the time this runs; a custom property that changes at runtime is the app's business
 * and is left alone, because it is never one of these.
 */
function collectVariables(css) {
  const values = new Map();
  const conflicting = new Set();
  for (const [, name, value] of css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)[;}]/g)) {
    const trimmed = value.trim();
    if (values.has(name) && values.get(name) !== trimmed) conflicting.add(name);
    values.set(name, trimmed);
  }
  for (const [, name, body] of css.matchAll(/@property\s+(--[\w-]+)\s*\{([^}]*)\}/g)) {
    const initial = /initial-value\s*:\s*([^;}]+)/.exec(body);
    if (initial) values.set(name, initial[1].trim());
  }
  // A property with two different values is a themed one: `--primary` is one colour under `:root`
  // and another under `.dark`, and which applies is a question only the cascade can answer.
  // Substituting picks whichever was written last and paints the dark palette in daylight, so
  // these are left for the engine, which resolves `var()` per node against the tokens in scope.
  //
  // Tailwind's own `--tw-*` plumbing is exempt. Those are set by one utility and read by another
  // on the same node, and every one of them also has a reset value, so they all look themed and
  // none of them is. They stay substituted, which is what they have always been.
  for (const name of conflicting) {
    if (!name.startsWith('--tw-')) values.delete(name);
  }
  return values;
}

/**
 * Find the next `var(` and return the whole call, its name and its fallback.
 *
 * Scanned rather than matched: a fallback can be `calc(1.75 / 1.125)` or another `var()`, and a
 * regex that stops at the first `)` silently leaves those alone - which is how the type scale
 * came out empty the first time.
 */
function nextVar(css, from) {
  const at = css.indexOf('var(', from);
  if (at === -1) return null;
  let depth = 0;
  for (let i = at + 3; i < css.length; i++) {
    if (css[i] === '(') depth++;
    else if (css[i] === ')' && --depth === 0) {
      const inside = css.slice(at + 4, i);
      const comma = splitOnce(inside);
      return { at, end: i + 1, name: comma.name.trim(), fallback: comma.fallback };
    }
  }
  return null;
}

/**
 * Whether a value refers to the property it is the value of, which would substitute forever.
 *
 * Matched to the end of the name rather than by prefix. `--tw-shadow`'s value mentions
 * `--tw-shadow-color`, which starts with it, and treating that as a self-reference left every
 * Tailwind shadow unsubstituted - so the file-wide reset won instead and no app has ever painted
 * one.
 */
function selfReferential(value, name) {
  return new RegExp(`var\\(\\s*${name.replace(/[-]/g, '\\-')}\\s*[,)]`).test(value);
}

/** Split `--x, fallback` at the first comma that is not inside parentheses. */
function splitOnce(inside) {
  let depth = 0;
  for (let i = 0; i < inside.length; i++) {
    if (inside[i] === '(') depth++;
    else if (inside[i] === ')') depth--;
    else if (inside[i] === ',' && depth === 0) {
      return { name: inside.slice(0, i), fallback: inside.slice(i + 1).trim() };
    }
  }
  return { name: inside, fallback: undefined };
}

/**
 * Custom properties the device supplies at runtime, which no build step can know.
 *
 * They have to survive this untouched, fallback and all: collapsing
 * `var(--safe-area-inset-bottom, 0px)` to `0px` here produces a layout that always sits under the
 * home indicator, and collapsing `var(--hairline, 1px)` to `1px` produces a divider three
 * physical pixels thick - both with nothing in the output to say why. Everything else is
 * substituted, because there is no CSS parser on device to do it later.
 *
 * A gradient's stops are here for a different reason: they are set by one class and read by
 * another, so no build step can know which pair a node will wear. See `expandGradients`.
 */
const RUNTIME_SUPPLIED =
  /^--(safe-area-inset-(top|right|bottom|left)|hairline|tw-gradient-(from|via|to)(-position)?)$/;

/**
 * Replace `var()` with what it resolves to, repeatedly, because theme values reference each other.
 *
 * A reference that resolves to nothing is left as it is: the engine resolves `var()` on device
 * too, and a value the app supplies at runtime - a safe-area inset, say - has to survive this.
 */
/**
 * Substitute inside one rule, with that rule's own declarations taking precedence.
 *
 * Tailwind's shadows, rings and filters are all built this way: a `*` reset gives every slot a
 * no-op default, and the utility that needs one declares it in the very rule that reads it.
 * Taking the file-wide value means taking the reset, because it is written last - so `.shadow-lg`
 * resolved its own `--tw-shadow` to `0 0 #0000` and painted nothing, silently, in every app.
 *
 * Only the rule's own block is consulted, not its ancestors'. That is enough for the pattern this
 * exists for, and anything wider is a cascade question the engine answers on device.
 */
function substituteInRules(css, values) {
  return css.replace(/([^{}]+)\{([^{}]*)\}/g, (whole, selector, body) => {
    const local = new Map(values);
    let changed = false;
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)[;}]?/g)) {
      const trimmed = value.trim();
      if (local.get(name) !== trimmed) changed = true;
      local.set(name, trimmed);
    }
    return changed ? `${selector}{${substituteVariables(body, local)}}` : whole;
  });
}

function substituteVariables(css, values) {
  let out = css;
  for (let pass = 0; pass < 5; pass++) {
    let changed = false;
    let from = 0;
    for (let found = nextVar(out, from); found; found = nextVar(out, from)) {
      // A runtime-supplied property is left exactly as written, fallback and all, because only
      // the device can answer it.
      if (RUNTIME_SUPPLIED.test(found.name)) {
        from = found.end;
        continue;
      }
      // `initial` in a custom property means it holds nothing, so `var()` takes its fallback.
      // Tailwind writes it in the reset for every optional slot - `--tw-shadow-color: initial` is
      // "nobody asked for a shadow colour" - and substituting the word itself produced a shadow
      // painted the colour `initial`, which is to say no shadow at all.
      const declared = values.get(found.name);
      const value = declared === undefined || declared === 'initial' ? found.fallback : declared;
      if (value === undefined || selfReferential(value, found.name)) {
        from = found.end;
        continue;
      }
      out = out.slice(0, found.at) + value + out.slice(found.end);
      from = found.at + value.length;
      changed = true;
    }
    if (!changed) break;
  }
  return out;
}

/** A selector list with its pseudo-element halves removed; null when nothing is left. */
function withoutPseudoElements(selectors) {
  const kept = selectors
    .split(',')
    .map((one) => one.trim())
    .filter((one) => one && !one.includes('::'));
  return kept.length ? kept.join(', ') : null;
}

/**
 * Drop the selectors that address something no template declares.
 *
 * `::before`, `::file-selector-button` and friends would mean synthesising view hierarchy from a
 * stylesheet, which this project refuses on purpose - see ADR 0001. The compiler would drop the
 * whole rule with a warning; here a rule that is *only* pseudo-elements is dropped whole, and one
 * that is partly them keeps the rest.
 */
function dropPseudoElementRules(css) {
  return css.replace(/([^{}]+)\{([^{}]*)\}/g, (whole, selectors, body) => {
    if (!selectors.includes('::')) return whole;
    const kept = withoutPseudoElements(selectors);
    return kept === null ? '' : `${kept} {${body}}`;
  });
}

/**
 * Fold arithmetic, by handing it to lightningcss with an old target.
 *
 * `calc(0.25rem * 4)` becomes `1rem`, which the engine's own compiler can then translate. The
 * target is a browser old enough to need the lowering; nothing about it reaches a device.
 *
 * Excluding the media-query features is load-bearing rather than tidiness. A target that old
 * lowers everything a browser that age would lack, and that includes Tailwind's own `(width <
 * 500px)` breakpoint and container queries - rewritten as `not (min-width: 500px)`, which the
 * engine's compiler refuses outright (`compile.cjs`'s own `flatten()` hit the same thing for
 * nesting, and fixed it the same way: ask for only the feature that needs lowering, rather than
 * lowering for a target). Left in, every `max-*` variant and range media query compiled to
 * nothing.
 *
 * Colours are excluded too. `oklch()` and the other perceptual spaces are the compiler's to
 * convert, so that one converter decides what every colour is. lightningcss's lowering gamut-maps
 * by an earlier draft of CSS Color 4, in single precision, and most of the palette came out a step
 * or more from the same `oklch()` written in a component's stylesheet.
 */
function fold(css) {
  const out = transform({
    filename: 'tailwind.css',
    code: Buffer.from(css),
    minify: false,
    targets: { chrome: 90 << 16 },
    exclude:
      Features.MediaRangeSyntax |
      Features.MediaIntervalSyntax |
      Features.OklabColors |
      Features.LabColors |
      Features.ColorFunction,
  }).code.toString();
  // Lowering can reintroduce feature detection around what it just lowered.
  return rewriteAtRule(out, '@supports', true);
}

/**
 * Turn a unitless `line-height` into a length, using the font size beside it.
 *
 * CSS reads `line-height: 1.5` as a ratio of the element's font size, and inherits the *ratio*;
 * React Native's `lineHeight` is a number of points and there is no ratio to inherit. Tailwind
 * always emits the two together - `.text-lg` is a size and its leading - so the multiplication can
 * be done here, once, where both are in the same rule. A ratio with no font size beside it is left
 * alone for the compiler to refuse, because guessing an inherited size would be worse than saying
 * nothing.
 */
function resolveUnitlessLineHeight(css) {
  return css.replace(/\{([^{}]*)\}/g, (whole, body) => {
    const ratio = /(^|;)\s*line-height\s*:\s*([0-9]*\.?[0-9]+)\s*(?=;|$)/.exec(body);
    if (!ratio) return whole;
    const size = /(^|;)\s*font-size\s*:\s*([0-9]*\.?[0-9]+)(rem|px)\s*(?=;|$)/.exec(body);
    if (!size) return whole;
    const height = Number(size[2]) * Number(ratio[2]);
    return whole.replace(ratio[0], `${ratio[1]} line-height: ${round(height)}${size[3]}`);
  });
}

/** Three decimal places is finer than a point on any screen, and keeps the output readable. */
function round(value) {
  return Math.round(value * 1000) / 1000;
}

/**
 * `border-top-style: solid` and its siblings.
 *
 * React Native has one `borderStyle` for the whole box, so a per-side one cannot be expressed;
 * `solid` is also its default, so Tailwind's `border-t` means nothing but its width. A side style
 * that is *not* solid is left to the compiler, which drops it and says so - the app asked for
 * something native cannot do, and should hear about it.
 */
function dropRedundantBorderStyles(css) {
  return css.replace(/\s*border-(top|right|bottom|left)-style\s*:\s*solid\s*;/g, '');
}

/**
 * The stops a Tailwind gradient is built from, in the order they are painted.
 *
 * Each is set by its own utility class - `from-blue-500`, `via-purple-500`, `to-pink-500` - and
 * the position by another (`from-20%`), so none of them can be resolved here. The fallback is the
 * `@property` default, which is what a sheet that never sets one should paint.
 */
const GRADIENT_STOPS = ['from', 'via', 'to'];

/**
 * A gradient Tailwind composed out of custom properties, rewritten as one with holes in it.
 *
 * Tailwind joins the three colour classes to the direction class through `--tw-gradient-stops`,
 * whose value is a *string* of further `var()` references that the browser assembles at paint
 * time. That is a CSS parser's job, and there is no parser on device - so the indirection is
 * undone here, back into a gradient whose stops are plain references the engine's own cascade
 * fills in per node. The middle stop disappears on its own wherever no `via-*` class defined it.
 *
 * The direction is read from the same rule, which is where Tailwind puts it, so a sheet with
 * twenty `bg-linear-*` classes keeps twenty different directions.
 */
function expandGradients(css, values) {
  return css.replace(/([^{}]*)\{([^{}]*)\}/g, (rule, selector, body) => {
    if (!body.includes('var(--tw-gradient-stops)')) return rule;

    const position = /--tw-gradient-position\s*:\s*([^;}]+)/.exec(body)?.[1] ?? '';
    // `in oklab` asks for an interpolation space, which native has no say in.
    const prelude = position.replace(/\bin\s+[\w-]+/g, '').trim();
    const stops = GRADIENT_STOPS.map((stop) => {
      const fallback = values.get(`--tw-gradient-${stop}-position`);
      const at = fallback
        ? `var(--tw-gradient-${stop}-position, ${fallback})`
        : `var(--tw-gradient-${stop}-position)`;
      return `var(--tw-gradient-${stop}) ${at}`;
    });

    const expanded = body
      .replace(/--tw-gradient-position\s*:[^;}]*;?/g, '')
      .replace(
        /(linear|radial)-gradient\(\s*var\(--tw-gradient-stops\)\s*\)/g,
        (_, kind) => `${kind}-gradient(${prelude ? `${prelude}, ` : ''}${stops.join(', ')})`,
      );
    return `${selector}{${expanded}}`;
  });
}

/** A class selector, escapes and all: `.dark`, `.platform-android`, `.md\:p-4`. */
const CLASS = String.raw`\.(?:\\.|[\w-])+`;
// A trailing pseudo-class or attribute selector - `:active`, `[data-disabled]`, `:focus` - is what
// a same-node variant (`press:`, `focus:`, `disabled:`) stacked on top adds after the `:is()`.
const STACKED = new RegExp(String.raw`^\s*(${CLASS})\s+:is\((${CLASS})\s+([^()]+)\)([^\s]*)\s*$`);

/**
 * A stacked variant, rewritten as the ancestor tests it means.
 *
 * `android:dark:bg-black` comes out of Tailwind as `.dark :is(.platform-android .x)`: an element
 * with some `.platform-android` ancestor and some `.dark` ancestor, in either order or both on one
 * node. The engine refuses a combinator inside `:is()`, so the whole rule used to be dropped and
 * every stacked platform and dark variant silently did nothing. Written out, it is three shapes
 * the engine does match - which matters most for the last, since `mount` and `watchConditions`
 * put both classes on the root.
 *
 * A same-node variant stacked on top of two ancestor ones - `ios:dark:press:bg-red-500` - adds a
 * pseudo-class *after* the closing paren (`.dark :is(.platform-ios .x):active`), which the
 * original pattern did not account for: it only matched a selector ending at the paren, so this
 * shape passed through unexpanded and the compiler refused it the same way. The suffix belongs on
 * the class in each of the three shapes, since it is the thing that has to match on the node
 * itself alongside the ancestor tests.
 */
function expandStackedVariants(css) {
  return css.replace(/([^{}]+)\{([^{}]*)\}/g, (whole, selectors, body) => {
    if (!selectors.includes(':is(')) return whole;
    let changed = false;
    const expanded = selectors.split(',').flatMap((selector) => {
      const match = STACKED.exec(selector);
      if (!match) return [selector.trim()];
      changed = true;
      const [, outer, inner, rest, suffix] = match;
      const self = `${rest}${suffix}`;
      return [`${outer} ${inner} ${self}`, `${inner} ${outer} ${self}`, `${outer}${inner} ${self}`];
    });
    return changed ? `${expanded.join(', ')}{${body}}` : whole;
  });
}

/**
 * Tailwind's output, as CSS the engine compiles.
 *
 * @param {string} css the CSS the Tailwind CLI produced
 * @returns {string} CSS with the browser-only parts answered or removed
 */
function flattenTailwind(css) {
  let out = css.replace(LAYER_STATEMENT, '');
  out = rewriteAtRule(out, '@layer', true);
  out = rewriteAtRule(out, '@supports', true);
  const values = collectVariables(out);
  out = rewriteAtRule(out, '@property', false);
  out = expandGradients(out, values);
  // The chain the gradient used to be assembled through, now that nothing reads it. Left in, it
  // is a token per gradient class in every bundle, holding the word `initial`.
  out = out.replace(/--tw-gradient(-via)?-stops\s*:[^;}]*;?/g, '');
  // The middle stop's reset. Tailwind's fallback for browsers without `@property` gives every
  // element `--tw-gradient-via: #0000`, where the web only puts a via stop in the gradient at all
  // when a `via-*` class asks. Kept, every two-stop gradient paints a transparent stop halfway
  // along, and a dark card shows whatever is behind it through a streak across the middle. With
  // no colour the engine leaves the stop out, which is what the web draws.
  out = out.replace(/--tw-gradient-via\s*:\s*(#0000|transparent|initial)\s*;?/g, '');
  // Rule-local first: a property a rule declares and reads is that rule's business, and the
  // file-wide map holds the `*` reset that would otherwise win.
  out = substituteInRules(out, values);
  out = substituteVariables(out, values);
  out = dropPseudoElementRules(out);
  out = expandStackedVariants(out);
  out = dropRedundantBorderStyles(out);
  return resolveUnitlessLineHeight(fold(out));
}

module.exports = { flattenTailwind };
