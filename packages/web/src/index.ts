/**
 * `@ng-native/web`'s public surface: a real browser host for `@ng-native/components`, over the
 * same `HostEngine` seam Fabric implements
 * (`packages/fabric/src/host.ts`).
 *
 * `mount.ts` is the one file with a documented relationship to `packages/platform`; the rest
 * (`browser-engine.ts`, `browser-renderer.ts`, `dom-node.ts`, `elements.ts`, `props.ts`,
 * `responder.ts`) has no native equivalent to compare itself to, because on native that work is
 * `packages/fabric`'s, not `packages/platform`'s. This package folds both roles into one, since a
 * browser host has no separate native-module boundary to split them across.
 */
export { BrowserEngine } from './browser-engine.ts';
export { BrowserRenderer, type BrowserRendererFactory } from './browser-renderer.ts';
export { nodeOf, pathTo, type BrowserNode, type BrowserNodeKind } from './dom-node.ts';
export { registerElementName, type ElementSpec } from './elements.ts';
export { NgNativeIsland, type IslandOutputHandler } from './island.ts';
export { mount, type MountOptions, type MountResult } from './mount.ts';
