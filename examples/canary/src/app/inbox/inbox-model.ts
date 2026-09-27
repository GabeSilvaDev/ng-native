import { computed, signal } from '@angular/core';

export interface Mail {
  readonly id: string;
  readonly from: string;
  readonly subject: string;
  readonly preview: string;
  readonly unread: boolean;
  readonly folder: 'inbox' | 'archive';
}

const PEOPLE = ['Ada', 'Grace', 'Alan', 'Katherine', 'Linus', 'Margaret', 'Ken', 'Barbara'];
const SUBJECTS = [
  'Lunch on Friday?',
  'The quarterly numbers',
  'Re: the release notes',
  'Your order has shipped',
  'Flight change',
  'Minutes from Tuesday',
  'A question about the API',
  'Photos from the weekend',
];

export function mailbox(count = 120): Mail[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `m${i}`,
    from: PEOPLE[i % PEOPLE.length]!,
    subject: `${SUBJECTS[i % SUBJECTS.length]} ${i}`,
    preview: 'A few lines of the message, enough to tell one from another in the list.',
    unread: i % 3 === 0,
    folder: i % 7 === 6 ? 'archive' : 'inbox',
  }));
}

/** The mailbox on this screen: two folders, a selection, and what the gestures do to them. */
export class Inbox {
  readonly mails = signal<readonly Mail[]>(mailbox());
  readonly selected = signal<ReadonlySet<string>>(new Set());
  readonly inbox = computed(() => this.mails().filter((mail) => mail.folder === 'inbox'));
  readonly archive = computed(() => this.mails().filter((mail) => mail.folder === 'archive'));
  readonly selecting = computed(() => this.selected().size > 0);

  remove(id: string): void {
    this.mails.update((mails) => mails.filter((mail) => mail.id !== id));
    this.deselect(id);
  }

  archiveMail(id: string): void {
    this.move([id], 'archive');
  }

  toggleSelected(id: string): void {
    this.selected.update((selected) => {
      const next = new Set(selected);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  archiveSelected(): void {
    this.move([...this.selected()], 'archive');
    this.selected.set(new Set());
  }

  clearSelection(): void {
    this.selected.set(new Set());
  }

  markRead(id: string): void {
    this.mails.update((mails) =>
      mails.map((mail) => (mail.id === id ? { ...mail, unread: false } : mail)),
    );
  }

  private move(ids: readonly string[], folder: Mail['folder']): void {
    const moving = new Set(ids);
    this.mails.update((mails) =>
      mails.map((mail) => (moving.has(mail.id) ? { ...mail, folder } : mail)),
    );
  }

  private deselect(id: string): void {
    if (!this.selected().has(id)) return;
    this.selected.update((selected) => new Set([...selected].filter((each) => each !== id)));
  }
}
