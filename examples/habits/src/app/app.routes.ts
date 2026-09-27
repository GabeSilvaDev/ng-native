import type { Routes } from '@angular/router';

/** Every screen loads when it is first opened, which is what keeps start-up fast. */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./tabs.ts').then((m) => m.Tabs),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'today' },
      {
        // A tab with a stack of its own, for the native header and its large title.
        path: 'today',
        loadComponent: () => import('./today/today.ts').then((m) => m.TodayStack),
        children: [
          { path: '', loadComponent: () => import('./today/today.ts').then((m) => m.Today) },
        ],
      },
      {
        path: 'settings',
        loadComponent: () => import('./settings/settings.ts').then((m) => m.Settings),
      },
    ],
  },
  {
    // A new habit and editing one share a form; presented as a modal either way. Both are matched
    // before the plain `:id` route below, or `new` and `:id/edit` would be read as ids.
    path: 'habit/new',
    loadComponent: () => import('./habit-form/habit-form.ts').then((m) => m.HabitForm),
  },
  {
    path: 'habit/:id/edit',
    loadComponent: () => import('./habit-form/habit-form.ts').then((m) => m.HabitForm),
  },
  {
    // On the app's stack, over the tabs, so a habit opened from Today pushes a real screen with a
    // back button and its own header.
    path: 'habit/:id',
    loadComponent: () => import('./habit-detail/habit-detail.ts').then((m) => m.HabitDetail),
  },
];
