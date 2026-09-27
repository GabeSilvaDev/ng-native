import { withComponentInputBinding } from '@angular/router';
import { provideNativeRouter } from '@ng-native/router';
import { routes } from './app.routes.ts';

/** Route params arrive as component inputs: the run detail screen's `id`. */
export const appConfig = {
  providers: [provideNativeRouter(routes, withComponentInputBinding())],
};
