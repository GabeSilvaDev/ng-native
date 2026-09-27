/**
 * The Angular half of the seam: `Renderer2` / `RendererFactory2` over the engine's mutation
 * API, plus the bootstrap that stands in for `platform-browser`, which is never booted here.
 */
export { NativeRendererFactory, mount, type MountResult } from './adapter.ts';
export { PLATFORM_NATIVE_ID, isPlatformNative } from './platform-id.ts';
