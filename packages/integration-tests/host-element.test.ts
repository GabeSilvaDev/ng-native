/**
 * Angular 22.0 reads `tagName.toLowerCase()` on every component's host element, to refuse a
 * `<script>` host; 22.1 dropped the check. An engine node is the host element here, so it has
 * to answer, or every mount on 22.0 throws before the first view is made.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Engine } from '@ng-native/fabric';
import { createFakeFabric } from '@ng-native/testing';

describe('an engine node as a host element', () => {
  it('answers tagName with its template name', () => {
    const engine = new Engine(createFakeFabric(), 1);
    assert.equal(engine.root.tagName, 'root');
    assert.equal(engine.createElement('view').tagName, 'view');
  });
});
