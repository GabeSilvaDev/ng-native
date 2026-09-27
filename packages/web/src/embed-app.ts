/**
 * Fixtures for `embed.test.ts`: an ordinary Angular web app, and the Angular Native components it
 * hosts. See `button-app.ts` for why a `@Component` lives out here rather than in the test file.
 *
 * The host components render through Angular's own DOM renderer, from
 * `@angular/platform-browser`; the island components render `<view>`, `<text>` and `<pressable>`
 * through this package's. The point of the tests is that the two live in one app.
 */
import {
  Component,
  ElementRef,
  InjectionToken,
  Injector,
  Service,
  inject,
  input,
  output,
  signal,
  viewChild,
  type OnDestroy,
  type Type,
} from '@angular/core';
import { Pressable, Text, View } from '@ng-native/components';
import { Screen } from '@ng-native/device';
import { NgNativeIsland } from './island.ts';

/** Provided by the host app's `bootstrapApplication`, not by `providedIn`. */
export const HOST_NAME = new InjectionToken<string>('HOST_NAME');

/** Provided by a component in the host app, above where the island is mounted. */
export const SECTION = new InjectionToken<string>('SECTION');

/** Every error the host app's `ErrorHandler` was handed. */
export const handled: unknown[] = [];

/** A root service the host app and its islands should share, not each own a copy of. */
@Service()
export class Tally {
  readonly count = signal(0);

  increment(): void {
    this.count.update((count) => count + 1);
  }
}

/** An island that reads the host's service and token, and changes the service on a press. */
@Component({
  selector: 'app-island-counter',
  imports: [Pressable, Text, View],
  template: `
    <view>
      <pressable id="island-press" (press)="tally.increment()">
        <text id="island-label">{{ hostName }}: {{ tally.count() }}</text>
      </pressable>
    </view>
  `,
})
export class IslandCounter {
  readonly tally = inject(Tally);
  readonly hostName = inject(HOST_NAME);
}

/** An island that reads a component-level provider, and the browser's device services. */
@Component({
  selector: 'app-island-details',
  imports: [Pressable, Text],
  template: `
    <pressable id="details-fail" (press)="fail()">
      <text id="details-section">{{ section }}</text>
    </pressable>
  `,
})
export class IslandDetails {
  readonly section = inject(SECTION);
  readonly screen = inject(Screen);

  fail(): void {
    throw new Error('island press failed');
  }
}

/** The host app's root: plain DOM, with an empty element for an island to mount into. */
@Component({
  selector: 'app-host',
  providers: [{ provide: SECTION, useValue: 'Accounts' }],
  template: `
    <p id="host-count">{{ tally.count() }}</p>
    <div #slot id="slot"></div>
  `,
})
export class HostShell {
  readonly tally = inject(Tally);
  readonly injector = inject(Injector);
  readonly slot = viewChild.required<ElementRef<HTMLElement>>('slot');
}

/** How many badges have been destroyed, across both kinds - so a test can see teardown. */
export const destroyed = { count: 0 };

@Component({
  selector: 'app-badge',
  imports: [Pressable, Text],
  template: `
    <pressable id="badge" (press)="pressed.emit(label())">
      <text id="badge-label">{{ label() }}</text>
    </pressable>
  `,
})
export class Badge implements OnDestroy {
  readonly label = input('');
  readonly pressed = output<string>();

  ngOnDestroy(): void {
    destroyed.count++;
  }
}

@Component({
  selector: 'app-other-badge',
  imports: [Text],
  template: `<text id="other-label">Other {{ label() }}</text>`,
})
export class OtherBadge implements OnDestroy {
  readonly label = input('');
  /** The same output as `Badge`, so the host's handlers carry over when it swaps one for the other. */
  readonly pressed = output<string>();

  ngOnDestroy(): void {
    destroyed.count++;
  }
}

/** A host page that places an island in its own template, with inputs and an output handler. */
@Component({
  selector: 'app-host',
  imports: [NgNativeIsland],
  template: `
    @if (shown()) {
      <ng-native-island
        [component]="component()"
        [inputs]="{ label: label() }"
        [outputs]="outputs()"
      />
    }
  `,
})
export class HostPage {
  readonly shown = signal(true);
  readonly component = signal<Type<unknown>>(Badge);
  readonly label = signal('Ada');
  readonly presses: string[] = [];
  readonly onPressed = (label: unknown): void => {
    this.presses.push(label as string);
  };
  readonly outputs = signal<Readonly<Record<string, (value: never) => void>>>({
    pressed: this.onPressed,
  });
}
