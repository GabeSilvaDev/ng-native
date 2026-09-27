/**
 * `__DEV__` is a global every React Native bundle has, set by Metro's prelude. App code reads it
 * directly, so a test of that code needs it too.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

declare const __DEV__: boolean;

test('defines __DEV__ as a development build does', () => {
  assert.equal(__DEV__, true);
});
