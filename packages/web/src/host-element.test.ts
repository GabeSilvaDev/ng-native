/**
 * Angular 22.0 reads `tagName.toLowerCase()` on every component's host element; see
 * `packages/integration-tests/host-element.test.ts`. A web root is a wrapper, not the element.
 */
import assert from 'node:assert/strict';
import { it } from 'node:test';
import { makeElementNode } from './dom-node.ts';
import { installJsdomEnvironment } from './jsdom-env.ts';

it('a wrapped node answers tagName with its template name', () => {
  const { document } = installJsdomEnvironment();
  assert.equal(makeElementNode('view', document.createElement('div')).tagName, 'view');
});
