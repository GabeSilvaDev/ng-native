import { Service, signal } from '@angular/core';

/** The note the sheet edits, kept outside the sheet so the page that opened it sees the result. */
@Service()
export class NoteDrafts {
  readonly saved = signal<string | null>(null);
}
