/**
 * What `packages/web/limits.md` says does not carry over to the web, failing the way it says.
 *
 * Worklets and gestures are native-only. The bases of their directives inject Fabric's `Engine`,
 * which `mount` does not provide, so one mounted on the web names what is missing rather than
 * rendering something silently wrong.
 *
 * The directives an app imports for them are not loaded here. They import React Native's own
 * packages, which a browser cannot load, and how that fails depends on what the workspace has
 * installed: a parse error where the package resolves, a failed fetch where it does not. The
 * failed fetch is also a Vite error for the whole page, which left every later test in the run
 * waiting on elements that never settled.
 */
import { describe, expect, it } from 'vitest';
import { boot } from './boot.ts';
import { WorkletApp } from '../src/limits-app.ts';

describe('what does not carry over to the web', () => {
  it("names Engine when a worklet directive's base is mounted", () => {
    expect(() => boot(WorkletApp)).toThrow(/NG0201[\s\S]*Engine/);
  });
});
