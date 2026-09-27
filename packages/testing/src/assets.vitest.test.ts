/**
 * An image referenced the React Native way, `require('./logo.png')`, which Metro turns into an
 * asset id. Vitest runs modules with no `require`, so the plugin stands in a `{ testUri }` the
 * way React Native's Jest preset does, rather than let the module throw as it is evaluated.
 */
import { Component } from '@angular/core';
import { Image } from '@ng-native/components';
import { render, screen } from '@ng-native/testing';
import { expect, test } from 'vitest';

@Component({
  selector: 'app-logo',
  imports: [Image],
  template: `<image testID="logo" [source]="logo" />`,
})
class Logo {
  protected readonly logo = require('./assets/logo.png');
}

test('a required image renders, with the path it was required by', async () => {
  const { instance } = await render(Logo);

  expect((instance as unknown as { logo: unknown }).logo).toEqual({ testUri: './assets/logo.png' });
  expect(screen.getByTestId('logo')).toBeTruthy();
});
