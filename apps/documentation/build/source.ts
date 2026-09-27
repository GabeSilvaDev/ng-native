/**
 * `import source from './button-variants.ts?source'` - a component's own text, highlighted.
 *
 * An example page shows a component running and shows the code that produced it, and the only
 * honest way to do the second is to read the first. Anything retyped into a markdown fence is a
 * copy that stops being true the moment the example is edited, and nothing fails when it does.
 *
 * Highlighting happens here for the same reason it does in `markdown.ts`: the site should not
 * ship a syntax highlighter to render text that was already known at build time.
 */
import { bundledThemes, createHighlighter, type Highlighter } from 'shiki';
import type { Plugin } from 'vite';
import { excerpt, withoutMarkers } from './excerpt.ts';

const SUFFIX = '?source';
/** `?excerpt`: only the region the file marks, in the language it names; see `excerpt.ts`. */
const EXCERPT = '?excerpt';

/**
 * `github-light`'s own comment colour, `#6e7781` on this page's `--surface-code`, is a 4.40:1
 * contrast ratio - just under the 4.5:1 WCAG AA asks of normal-size text, and every example on
 * this site opens with a comment. See `build/markdown.ts`, which tunes the same theme for prose
 * code blocks the same way and for the same reason; this file needs its own copy because it
 * builds its own `Highlighter` instance rather than sharing markdown's.
 */
const LIGHT_COMMENT = '#6e7781';
const LIGHT_COMMENT_AA = '#677079';

let highlighter: Promise<Highlighter> | undefined;

/**
 * Tuned before a highlighter ever loads it, not read back from one with `getTheme()` and
 * reloaded - see `build/markdown.ts`'s identical function for why the resolved theme a running
 * highlighter hands back does not reliably re-tokenize once mutated.
 */
async function tunedLightTheme() {
  const { default: theme } = await bundledThemes['github-light-default']();
  const tuned = JSON.parse(JSON.stringify(theme));
  tuned.name = 'docs-light';
  for (const rule of tuned.tokenColors ?? []) {
    if (rule.settings?.foreground === LIGHT_COMMENT) rule.settings.foreground = LIGHT_COMMENT_AA;
  }
  return tuned;
}

function shiki(): Promise<Highlighter> {
  highlighter ??= tunedLightTheme().then((docsLight) =>
    createHighlighter({
      themes: [docsLight, 'github-dark-default'],
      langs: ['ts', 'css', 'html'],
    }),
  );
  return highlighter;
}

export function source(): Plugin {
  return {
    name: 'angular-native-docs-source',
    enforce: 'pre',
    async load(id) {
      const suffix = [SUFFIX, EXCERPT].find((end) => id.endsWith(end));
      if (!suffix) return undefined;
      const file = id.slice(0, -suffix.length);
      const text = await import('node:fs/promises').then((fs) => fs.readFile(file, 'utf8'));
      const region = suffix === EXCERPT ? excerpt(text) : undefined;
      const shown = region ? region.text : trimLicenceHeader(withoutMarkers(text));
      const html = (await shiki()).codeToHtml(shown, {
        lang: region?.lang ?? 'ts',
        themes: { light: 'docs-light', dark: 'github-dark-default' },
        defaultColor: false,
      });
      return (
        `export const text = ${JSON.stringify(shown)};\n` +
        `export const html = ${JSON.stringify(html)};\n` +
        `export default html;\n`
      );
    },
  };
}

/**
 * Drops a leading block comment.
 *
 * Every example file in this app opens with a note explaining what it is showing, which belongs
 * to the page rather than to the code a reader would paste into their own project.
 */
function trimLicenceHeader(text: string): string {
  const match = /^\s*\/\*[\s\S]*?\*\/\s*/.exec(text);
  return (match ? text.slice(match[0].length) : text).trimEnd() + '\n';
}
