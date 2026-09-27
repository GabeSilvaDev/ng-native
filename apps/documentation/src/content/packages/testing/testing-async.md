---
title: Testing async work
summary: findBy* queries and waitFor, for whatever arrives after the first frame.
---

# Testing async work

Continues from [Writing a test](/packages/testing/writing-a-test). For something that arrives
later, a `findBy*` query retries until it matches, for up to a second by default:

```ts
import { Component, signal } from '@angular/core';
import { Text } from '@ng-native/components';
import { render, screen, waitFor } from '@ng-native/testing';
import { expect, it } from 'vitest';

@Component({
  selector: 'app-later',
  imports: [Text],
  template: `
    @if (ready()) {
      <text>Loaded</text>
    } @else {
      <text>Loading</text>
    }
  `,
})
class Later {
  protected readonly ready = signal(false);
  constructor() {
    setTimeout(() => this.ready.set(true), 100);
  }
}

it('finds what arrives later', async () => {
  await render(Later);

  expect(await screen.findByText('Loaded')).toBeTruthy();
});
```

`waitFor` does the same for any assertion, retrying until it stops throwing. Continuing with
`Later` from above:

```ts
it('waits for an assertion to pass', async () => {
  await render(Later);

  await waitFor(() => expect(screen.queryByText('Loading')).toBeNull());
});
```

Both take `{ timeout, interval }` in milliseconds, and both run on real timers, so a test that
installs a fake clock has to advance it itself.
