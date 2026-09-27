import type { Routes } from '@angular/router';

/** Every screen loads when it is first opened, which is what keeps start-up fast. */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./tabs.ts').then((m) => m.Tabs),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'library' },
      {
        // A tab with a stack of its own, so the library gets a native header for its large title
        // and search bar, and album detail has somewhere to push onto.
        path: 'library',
        loadComponent: () => import('./library/library.ts').then((m) => m.LibraryStack),
        children: [
          { path: '', loadComponent: () => import('./library/library.ts').then((m) => m.Library) },
          {
            path: 'album/:id',
            loadComponent: () => import('./album/album.ts').then((m) => m.AlbumDetail),
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
    // On the app's own stack, over the tabs, so it can be opened from the mini player on any tab
    // and always presents the same way.
    path: 'now-playing',
    loadComponent: () => import('./now-playing/now-playing.ts').then((m) => m.NowPlaying),
  },
];
