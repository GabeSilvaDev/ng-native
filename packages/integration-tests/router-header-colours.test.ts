/**
 * A header bar's colour when the app never named one.
 *
 * A native header is configured with props, and a prop cannot read the cascade, so `backgroundColor`
 * left unset means each platform decides for itself. iOS follows the system appearance and looks
 * broadly right. Android takes the app theme's `colorPrimary`, which is the framework's default
 * blue - so every screen of every app built here had a blue bar above a themed screen, and the
 * props that would fix it worked but nobody had bound them.
 *
 * The defaults are shadcn's `--background` and `--foreground`, written out because there is no way
 * for a prop to read them, and replaceable through `NATIVE_HEADER_PALETTE` for an app that retunes
 * its palette.
 */
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { Type } from '@angular/core';
import { ColorScheme, type Scheme } from '@ng-native/device';
import { cleanup, render, screen } from '@ng-native/testing';
import { NATIVE_HEADER_PALETTE } from '../router/src/native-header-palette.ts';
import { compileFixture } from './compile.ts';

describe('a header nobody gave a colour', () => {
  let mod: Record<string, unknown>;

  before(async () => {
    mod = await compileFixture(
      fileURLToPath(new URL('./fixtures/header-colours.ts', import.meta.url)),
    );
  });

  const bar = async (name: string, scheme: Scheme, palette?: unknown) => {
    await render(mod[name] as Type<unknown>, {
      providers: [
        {
          provide: ColorScheme.SOURCE,
          useValue: { current: () => scheme, subscribe: () => () => {} },
        },
        ...(palette ? [{ provide: NATIVE_HEADER_PALETTE, useValue: palette }] : []),
      ],
    });
    const props = screen.getByTestId('bar').props;
    cleanup();
    return props;
  };

  it('takes the light background rather than the platform default', async () => {
    const props = await bar('HeaderDefault', 'light');
    assert.equal(props['backgroundColor'], 'rgb(255, 255, 255)');
    assert.equal(props['color'], 'rgb(10, 10, 10)');
    assert.equal(props['titleColor'], 'rgb(10, 10, 10)', 'the title too, not just the tint');
  });

  it('follows the scheme, which is the half iOS already did and Android did not', async () => {
    const props = await bar('HeaderDefault', 'dark');
    assert.equal(props['backgroundColor'], 'rgb(10, 10, 10)');
    assert.equal(props['color'], 'rgb(250, 250, 250)');
  });

  it('never overrides a colour the call site named', async () => {
    // The defaults fill gaps. A header that says `backgroundColor` means it, and its foreground
    // still comes from the palette, because those are two separate questions.
    const props = await bar('HeaderBound', 'light');
    assert.equal(props['backgroundColor'], '#ff0000');
    assert.equal(props['color'], 'rgb(10, 10, 10)');
  });

  it('takes an app palette over the built-in one', async () => {
    const props = await bar('HeaderDefault', 'light', {
      light: { background: '#123456', foreground: '#abcdef' },
      dark: { background: '#000000', foreground: '#ffffff' },
    });
    assert.equal(props['backgroundColor'], '#123456');
    assert.equal(props['color'], '#abcdef');
  });
});

describe('a large title nobody configured', () => {
  let mod: Record<string, unknown>;

  before(async () => {
    mod = await compileFixture(
      fileURLToPath(new URL('./fixtures/header-colours.ts', import.meta.url)),
    );
  });

  const bar = async (name: string) => {
    await render(mod[name] as Type<unknown>);
    const props = screen.getByTestId('bar').props;
    cleanup();
    return props;
  };

  it('is drawn as iOS draws one: over the content, clear at the top, collapsing as it scrolls', async () => {
    // Since iOS 26 the large title sits in the scroll view, above its content, and a bar with a
    // background there paints over it; and over an opaque bar the inline title never fades in.
    const props = await bar('HeaderLarge');
    assert.equal(props['translucent'], true);
    assert.equal(props['largeTitleBackgroundColor'], 'transparent');
    assert.equal(props['largeTitleHideShadow'], true);
  });

  it('never overrides what the call site asked for', async () => {
    const props = await bar('HeaderLargeOpaque');
    assert.equal(props['translucent'], false);
    assert.equal(props['largeTitleBackgroundColor'], '#ff0000');
    assert.equal(props['largeTitleHideShadow'], false);
  });

  it('leaves a header without one alone', async () => {
    const props = await bar('HeaderDefault');
    assert.equal(props['translucent'], undefined);
    assert.equal(props['largeTitleBackgroundColor'], undefined);
  });
});
