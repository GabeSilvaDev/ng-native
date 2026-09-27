import type { Routes } from '@angular/router';

/** Every screen loads when it is first opened, which is what keeps start-up fast. */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./tabs.ts').then((m) => m.Tabs),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', loadComponent: () => import('./home/home.ts').then((m) => m.Home) },
      {
        // A tab with a stack of its own, which is what gives it a native header to put the
        // large title and the search bar in.
        path: 'activity',
        loadComponent: () => import('./activity/activity.ts').then((m) => m.ActivityStack),
        children: [
          {
            path: '',
            loadComponent: () => import('./activity/activity.ts').then((m) => m.Activity),
          },
        ],
      },
      {
        path: 'settings',
        loadComponent: () => import('./settings/settings.ts').then((m) => m.Settings),
      },
    ],
  },
  {
    // On the app's stack, over the tabs, so home and activity both open it the same way. Inside
    // the activity tab's stack, opening one from home would land in that stack with nothing under
    // it to go back to.
    path: 'payment/:id',
    loadComponent: () => import('./payments/payment-detail.ts').then((m) => m.PaymentDetail),
  },
  { path: 'send', loadComponent: () => import('./send/send.ts').then((m) => m.Send) },
];
