/**
 * `packages/icons`' shapes, over `BrowserEngine` - the reason icons painted nothing at all before
 * this file's counterparts (`elements.ts`'s SVG entries, `props.ts`'s
 * `SVG_PRESENTATION_HANDLERS`/`SVG_ROOT_HANDLERS`, `dom-node.ts`'s brush seeding) existed.
 * `svg-elements.ts` commits `svg-path`, `ng-icon` and the rest as literal custom elements with no
 * special meaning to a browser unless something creates them in the SVG namespace and translates
 * react-native-svg's props into real SVG attributes; `svg.test.ts` asserts on exactly that -
 * namespace, tag name, and the attributes a browser would actually paint from - rather than only
 * that an element exists, which would have passed before any of this worked.
 */
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { SVG_NAMESPACE } from './elements.ts';
import { installJsdomEnvironment } from './jsdom-env.ts';

async function bootstrapSvg() {
  const { document } = installJsdomEnvironment();
  const [{ mount }, { SvgApp }] = await Promise.all([import('./mount.ts'), import('./svg-app.ts')]);
  const root = document.createElement('app-root');
  document.body.appendChild(root);
  mount(root, SvgApp);
  return { document };
}

describe('ng-icon, over real SVG elements', () => {
  let document: Document;

  before(async () => {
    ({ document } = await bootstrapSvg());
  });

  const icon = () => document.getElementById('icon-root') as unknown as SVGSVGElement;
  const iconShape = (tag: string) =>
    icon().querySelector(`[data-rn="${tag}"]`) as SVGElement | null;

  it('commits the root as a real <svg>, in the SVG namespace', () => {
    assert.equal(icon().namespaceURI, SVG_NAMESPACE);
    assert.equal(icon().tagName, 'svg');
  });

  it('carries the parsed viewBox, the size input, and a meet/xMidYMid aspect ratio', () => {
    assert.equal(icon().getAttribute('viewBox'), '0 0 24 24');
    assert.equal(icon().getAttribute('width'), '32');
    assert.equal(icon().getAttribute('height'), '32');
    assert.equal(icon().getAttribute('preserveAspectRatio'), 'xMidYMid meet');
  });

  it('resolves the `color` input as a real CSS color, for currentColor to read', () => {
    // jsdom's CSSOM may re-serialise a hex colour; what matters is that *some* colour landed,
    // not its exact spelling.
    assert.match(icon().style.color, /#111827|rgb\(17,\s*24,\s*39\)/);
  });

  it("wraps the parsed markup in a real <g>, carrying the root svg tag's own presentation attrs", () => {
    const group = iconShape('svg-g') as SVGGElement;
    assert.equal(group.namespaceURI, SVG_NAMESPACE);
    assert.equal(group.tagName, 'g');
    assert.equal(group.getAttribute('fill'), 'none', 'root fill="none" -> a real none, not black');
    assert.equal(group.getAttribute('stroke'), 'currentColor');
    assert.equal(group.getAttribute('stroke-width'), '1.5');
  });

  it("commits <path> real, with no fill/stroke of its own - inheriting the group's", () => {
    const path = iconShape('svg-path') as SVGPathElement;
    assert.equal(path.namespaceURI, SVG_NAMESPACE);
    assert.equal(path.tagName, 'path');
    assert.equal(path.getAttribute('d'), 'M4 4h16v16H4z');
    // Integers on the native prop, translated back to the keywords a browser wants.
    assert.equal(path.getAttribute('stroke-linecap'), 'round');
    assert.equal(path.getAttribute('stroke-linejoin'), 'round');
    // Never declared its own fill/stroke, so nothing is written - real SVG inheritance from the
    // wrapping <g> is what paints it, exactly like it would from a `currentColor` ancestor group
    // on native.
    assert.equal(path.hasAttribute('fill'), false);
    assert.equal(path.hasAttribute('stroke'), false);
  });

  it('translates a resolved colour brush, and integer fill-rule/clip-rule, on <circle>', () => {
    const circle = iconShape('svg-circle') as SVGCircleElement;
    assert.equal(circle.tagName, 'circle');
    assert.equal(circle.getAttribute('cx'), '12');
    assert.equal(circle.getAttribute('fill'), '#ff9f0a');
    assert.equal(circle.getAttribute('fill-rule'), 'evenodd');
    assert.equal(circle.getAttribute('clip-rule'), 'evenodd');
  });

  it('writes an explicit fill="none" on <rect> - the brush the early-return bug used to drop', () => {
    const rect = iconShape('svg-rect') as SVGRectElement;
    assert.equal(rect.tagName, 'rect');
    // The point of `dom-node.ts`'s seeding: without it this attribute is never written at all,
    // and a browser's own default fill (opaque black) paints instead of nothing.
    assert.equal(rect.getAttribute('fill'), 'none');
    assert.equal(rect.getAttribute('stroke-dasharray'), '4,2');
    // `transform="translate(3,4)"` as the 2x3 matrix `RNSVGRect` actually takes.
    assert.equal(rect.getAttribute('transform'), 'matrix(1,0,0,1,3,4)');
  });

  it('commits <line> real, with its own x1/y1/x2/y2/stroke - the one shape name nothing else here exercises', () => {
    const line = iconShape('svg-line') as SVGLineElement;
    assert.equal(line.namespaceURI, SVG_NAMESPACE);
    assert.equal(line.tagName, 'line');
    assert.equal(line.getAttribute('x1'), '2');
    assert.equal(line.getAttribute('x2'), '22');
    assert.equal(line.getAttribute('stroke'), '#e5e7eb');
  });
});
