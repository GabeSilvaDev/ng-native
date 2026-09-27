/**
 * Telling Metro that our compiler changed.
 *
 * Metro caches a transform result against the file's content and its own version, and knows
 * nothing about the transformer it called. So editing this project's compiler and restarting the
 * dev server is not enough: every file whose own text has not changed keeps the output it was
 * given by the old compiler, and only the files you also happen to edit pick the change up. The
 * failure is a half-applied compiler, which is worse to read than one that did not apply at all.
 *
 * A fingerprint of the compiler's own sources goes into `cacheVersion`, which is the documented
 * lever for exactly this, and changes the cache key for everything the moment the compiler moves.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { compilerFingerprint } = require('@ng-native/metro/config.cjs') as {
  compilerFingerprint(dir: string): string;
};

/** A throwaway directory that looks like the compiler's own. */
function sandbox(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'fingerprint-'));
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(path.join(dir, path.dirname(name)), { recursive: true });
    writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

describe('the compiler fingerprint', () => {
  it('is the same for the same sources', () => {
    const a = sandbox({ 'transform.cjs': 'one', 'css/compile.cjs': 'two' });
    const b = sandbox({ 'transform.cjs': 'one', 'css/compile.cjs': 'two' });
    assert.equal(compilerFingerprint(a), compilerFingerprint(b));
    rmSync(a, { recursive: true });
    rmSync(b, { recursive: true });
  });

  it('changes when a source changes, which is the whole point', () => {
    const dir = sandbox({ 'transform.cjs': 'one' });
    const before = compilerFingerprint(dir);
    writeFileSync(path.join(dir, 'transform.cjs'), 'one, but different');
    assert.notEqual(compilerFingerprint(dir), before);
    rmSync(dir, { recursive: true });
  });

  it('changes when a source is added, since a new rule is a new compiler', () => {
    const dir = sandbox({ 'transform.cjs': 'one' });
    const before = compilerFingerprint(dir);
    writeFileSync(path.join(dir, 'extra.cjs'), 'more');
    assert.notEqual(compilerFingerprint(dir), before);
    rmSync(dir, { recursive: true });
  });

  it('changes when a source is renamed, since a require names the file', () => {
    const a = sandbox({ 'one.cjs': 'same' });
    const b = sandbox({ 'two.cjs': 'same' });
    assert.notEqual(compilerFingerprint(a), compilerFingerprint(b));
    rmSync(a, { recursive: true });
    rmSync(b, { recursive: true });
  });

  it('reaches into subdirectories, where the CSS compiler lives', () => {
    const dir = sandbox({ 'transform.cjs': 'one', 'css/compile.cjs': 'two' });
    const before = compilerFingerprint(dir);
    writeFileSync(path.join(dir, 'css', 'compile.cjs'), 'two, but different');
    assert.notEqual(compilerFingerprint(dir), before);
    rmSync(dir, { recursive: true });
  });

  it('ignores what cannot change the output', () => {
    // A README beside the compiler is not the compiler. Hashing everything would invalidate every
    // app's cache on a typo fix, and a cache that clears too eagerly gets turned off.
    const dir = sandbox({ 'transform.cjs': 'one' });
    const before = compilerFingerprint(dir);
    writeFileSync(path.join(dir, 'README.md'), 'notes');
    assert.equal(compilerFingerprint(dir), before);
    rmSync(dir, { recursive: true });
  });

  it('answers for the real compiler, which is what a config asks it', () => {
    const real = compilerFingerprint(path.dirname(require.resolve('@ng-native/metro/config.cjs')));
    assert.match(real, /^[0-9a-f]{16}$/);
  });
});
