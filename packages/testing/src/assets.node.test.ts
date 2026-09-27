/**
 * The node:test half of `assets.vitest.test.ts`: an ES module under Node has no `require` either,
 * so the hook stands in `{ testUri }` for a required image the same way the Vitest plugin does.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Component } from '@angular/core';
import { Image } from '@ng-native/components';
import { render, screen } from '@ng-native/testing';

@Component({
  selector: 'app-logo',
  imports: [Image],
  template: `<image testID="logo" [source]="logo" />`,
})
class Logo {
  readonly logo = require('./assets/logo.png');
}

test('a required image renders, with the path it was required by', async () => {
  const { instance } = await render(Logo);

  assert.deepEqual(instance.logo, { testUri: './assets/logo.png' });
  assert.ok(screen.getByTestId('logo'));
});
