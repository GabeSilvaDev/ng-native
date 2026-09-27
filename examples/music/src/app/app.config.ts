import { withComponentInputBinding } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import {
  lucideChevronDown,
  lucidePause,
  lucidePlay,
  lucideRepeat,
  lucideRepeat1,
  lucideShuffle,
  lucideSkipBack,
  lucideSkipForward,
} from '@ng-icons/lucide';
import { provideNativeRouter } from '@ng-native/router';
import { routes } from './app.routes.ts';

/** Route params arrive as component inputs: the album screen's `id`. */
export const appConfig = {
  providers: [
    provideNativeRouter(routes, withComponentInputBinding()),
    // Provided once, at the root, rather than repeated on every component that shows a transport
    // control: the mini player, Now Playing and the album screen's "Play all" all draw from it.
    provideIcons({
      lucideChevronDown,
      lucidePause,
      lucidePlay,
      lucideRepeat,
      lucideRepeat1,
      lucideShuffle,
      lucideSkipBack,
      lucideSkipForward,
    }),
  ],
};
