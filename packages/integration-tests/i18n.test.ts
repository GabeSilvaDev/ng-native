/**
 * Angular's i18n runtime, rendering onto Fabric.
 *
 * It decides whether an i18n node is text or a comment by the DOM's `Node.TEXT_NODE` and
 * `Node.COMMENT_NODE`. The Metro polyfills define a `Node` for Angular's dev assertions, and while
 * that `Node` had only `ELEMENT_NODE`, both read `undefined`, the comment case matched first, and
 * every translated string was created as an empty comment: an `i18n` element rendered nothing.
 *
 * `@angular/localize/init` with no translations loaded, so each message renders its source text.
 * Translations, extraction and the rest are in `localisation.test.ts`.
 */
import '@angular/localize/init';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { Type } from '@angular/core';
import { cleanup, screen, render, settle } from '@ng-native/testing';
import type { FakeFabricNode } from '@ng-native/testing';
import { compileFixture } from './compile.ts';

describe('i18n', () => {
  let host: { name: { set(v: string): void } };

  before(async () => {
    const mod = await compileFixture(fileURLToPath(new URL('./fixtures/i18n.ts', import.meta.url)));
    const rendered = await render(mod['I18nHost'] as Type<unknown>);
    host = rendered.instance as typeof host;
  });

  after(cleanup);

  // The library has no "text content of a node found by id" query, so this walks the found
  // node's own subtree for `RawText` rather than using `getByTestId` alone.
  const rawText = (node: FakeFabricNode): string =>
    node.viewName === 'RawText'
      ? String(node.props['text'] ?? '')
      : node.children.map(rawText).join('');
  const textOf = (id: string) => rawText(screen.getByTestId(id));

  it('renders an i18n element as text, not as an empty comment', () => {
    assert.equal(textOf('plain'), 'Plain text');
  });

  it('renders an interpolation inside an i18n message, and follows it', async () => {
    assert.equal(textOf('greeting'), 'Hello, Ada!');
    host.name.set('Grace');
    await settle();
    assert.equal(textOf('greeting'), 'Hello, Grace!');
  });
});
