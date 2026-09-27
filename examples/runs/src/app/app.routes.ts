import type { Routes } from '@angular/router';

/** Every screen loads when it is first opened, which is what keeps start-up fast. */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./tabs.ts').then((m) => m.Tabs),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'run' },
      { path: 'run', loadComponent: () => import('./run/run.ts').then((m) => m.Run) },
      {
        // A tab with a stack of its own, for the native header and its large title.
        path: 'history',
        loadComponent: () => import('./history/history.ts').then((m) => m.HistoryStack),
        children: [
          { path: '', loadComponent: () => import('./history/history.ts').then((m) => m.History) },
        ],
      },
      {
        path: 'settings',
        loadComponent: () => import('./settings/settings.ts').then((m) => m.Settings),
      },
    ],
  },
  {
    // On the app's own stack, over the tabs, so a run opened from History pushes a real screen
    // with a back button and its own header.
    path: 'runs/:id',
    loadComponent: () => import('./run-detail/run-detail.ts').then((m) => m.RunDetail),
  },
];
