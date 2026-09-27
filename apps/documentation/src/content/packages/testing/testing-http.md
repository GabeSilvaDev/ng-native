---
title: Testing HttpClient
summary: Answering a request from the test instead of the network, with HttpTestingController.
---

# Testing HttpClient

Continues from [Writing a test](/packages/testing/writing-a-test). Provide `HttpClient` the way
the app does, with `provideNativeHttpClient()`, then Angular's own `provideHttpClientTesting()`
after it. Requests go to `HttpTestingController` instead of the network, and the test answers them:

```ts
import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Text } from '@ng-native/components';
import { provideNativeHttpClient } from '@ng-native/platform/http';
import { render, screen } from '@ng-native/testing';
import { expect, it } from 'vitest';

@Component({
  selector: 'app-profile',
  imports: [Text],
  template: '<text>{{ name() }}</text>',
})
class Profile {
  protected readonly name = signal('...');
  constructor() {
    inject(HttpClient)
      .get<{ name: string }>('/api/me')
      .subscribe((me) => this.name.set(me.name));
  }
}

it('answers a request from the test', async () => {
  const { componentRef } = await render(Profile, {
    providers: [provideNativeHttpClient(), provideHttpClientTesting()],
  });
  const http = componentRef.injector.get(HttpTestingController);

  http.expectOne('/api/me').flush({ name: 'Ada' });

  expect(await screen.findByText('Ada')).toBeTruthy();
  http.verify();
});
```

`componentRef.injector` is the component's injector, so anything the app provides can be reached
from the test the same way.
