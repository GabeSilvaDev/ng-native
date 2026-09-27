import type { Routes } from '@angular/router';

/** Every screen loads when it is first opened, which is what keeps start-up fast. */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./tabs.ts').then((m) => m.Tabs),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'notes' },
      {
        // A tab with a stack of its own, for the native header, its large title and search bar.
        path: 'notes',
        loadComponent: () => import('./notes/notes-list.ts').then((m) => m.NotesStack),
        children: [
          {
            path: '',
            loadComponent: () => import('./notes/notes-list.ts').then((m) => m.NotesList),
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
    // Matched before the plain `:id` route below, or "new" would be read as an id.
    path: 'note/new',
    loadComponent: () => import('./editor/editor.ts').then((m) => m.Editor),
  },
  {
    // On the app's stack, over the tabs, so a note opened from the list pushes a real screen with
    // a back button and its own header.
    path: 'note/:id',
    loadComponent: () => import('./editor/editor.ts').then((m) => m.Editor),
  },
];
