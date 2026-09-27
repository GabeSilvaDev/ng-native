---
title: Testing with services
summary: Replacing an injected dependency with a stand-in for the test.
---

# Testing with services

Continues from [Writing a test](/packages/testing/writing-a-test). `providers` are the providers of
the app the component is mounted in, so replacing a service with a stand-in is ordinary dependency
injection:

```ts
import { Component, Injectable, inject, resource } from '@angular/core';
import { Text } from '@ng-native/components';
import { render, screen } from '@ng-native/testing';
import { expect, it } from 'vitest';

@Injectable({ providedIn: 'root' })
class Weather {
  today(): Promise<string> {
    return fetch('https://example.com/weather').then((response) => response.text());
  }
}

@Component({
  selector: 'app-forecast',
  imports: [Text],
  template: '<text>{{ forecast.value() ?? "..." }}</text>',
})
class Forecast {
  private readonly weather = inject(Weather);
  protected readonly forecast = resource({ loader: () => this.weather.today() });
}

it('replaces a service with a stand-in', async () => {
  await render(Forecast, {
    providers: [{ provide: Weather, useValue: { today: async () => 'Sunny' } }],
  });

  expect(await screen.findByText('Sunny')).toBeTruthy();
});
```
