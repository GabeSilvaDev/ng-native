import { Service, computed, inject, signal } from '@angular/core';

export interface Project {
  readonly id: string;
  readonly name: string;
}

export interface Task {
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly notes: string;
  readonly done: boolean;
  readonly assignee: string;
  /** Bumped by every save, here or on the server, so a stale copy can be told from a fresh one. */
  readonly version: number;
}

export interface TaskComment {
  readonly id: string;
  readonly taskId: string;
  readonly author: string;
  readonly text: string;
}

export interface Person {
  readonly id: string;
  readonly name: string;
  readonly role: string;
}

export const PEOPLE: readonly Person[] = [
  { id: 'ada', name: 'Ada Lovelace', role: 'Engineering' },
  { id: 'grace', name: 'Grace Hopper', role: 'Platform' },
  { id: 'alan', name: 'Alan Turing', role: 'Research' },
  { id: 'katherine', name: 'Katherine Johnson', role: 'Navigation' },
];

const NAMES = ['Launch', 'Website', 'Mobile app', 'Research', 'Hiring', 'Office move'];
const VERBS = ['Draft', 'Review', 'Ship', 'Test', 'Plan', 'Fix', 'Document', 'Design'];
const THINGS = ['the brief', 'onboarding', 'the budget', 'search', 'the release notes', 'checkout'];

function seed(): { projects: Project[]; tasks: Task[]; comments: TaskComment[] } {
  const projects = NAMES.map((name, i) => ({ id: `p${i + 1}`, name }));
  const tasks: Task[] = [];
  const comments: TaskComment[] = [];
  projects.forEach((project, p) => {
    for (let i = 0; i < 40; i++) {
      const n = p * 40 + i;
      const id = `t${n + 1}`;
      tasks.push({
        id,
        projectId: project.id,
        title: `${VERBS[n % VERBS.length]} ${THINGS[n % THINGS.length]}`,
        notes: n % 3 === 0 ? 'Needs sign-off before Friday.' : '',
        done: n % 4 === 0,
        assignee: PEOPLE[n % PEOPLE.length]!.id,
        version: 1,
      });
      for (let c = 0; c < 3; c++) {
        comments.push({
          id: `c${n * 3 + c + 1}`,
          taskId: id,
          author: PEOPLE[(n + c + 1) % PEOPLE.length]!.id,
          text: ['Looks good to me.', 'Can we split this in two?', 'Blocked on the API.'][c]!,
        });
      }
    }
  });
  return { projects, tasks, comments };
}

/** The server, simulated: slow, able to fail, and edited by other people from time to time. */
@Service()
export class ProjectServer {
  latency = 350;
  offline = false;
  private readonly data = seed();

  projects(): Promise<Project[]> {
    return this.respond(() => this.data.projects.map((project) => ({ ...project })));
  }

  tasks(): Promise<Task[]> {
    return this.respond(() => this.data.tasks.map((task) => ({ ...task })));
  }

  comments(): Promise<TaskComment[]> {
    return this.respond(() => this.data.comments.map((comment) => ({ ...comment })));
  }

  save(task: Task): Promise<Task> {
    return this.respond(() => {
      const stored = { ...task, version: task.version + 1 };
      const at = this.data.tasks.findIndex((existing) => existing.id === task.id);
      if (at === -1) this.data.tasks.push(stored);
      else this.data.tasks[at] = stored;
      return { ...stored };
    });
  }

  remove(id: string): Promise<void> {
    return this.respond(() => {
      this.data.tasks = this.data.tasks.filter((task) => task.id !== id);
    });
  }

  /** Someone else renames a task, which this device only learns on its next refresh. */
  editElsewhere(id: string): void {
    const at = this.data.tasks.findIndex((task) => task.id === id);
    if (at === -1) return;
    const task = this.data.tasks[at]!;
    this.data.tasks[at] = {
      ...task,
      title: `${task.title} (edited by Grace)`,
      version: task.version + 1,
    };
  }

  private respond<T>(answer: () => T): Promise<T> {
    const fail = this.offline;
    return new Promise((resolve, reject) => {
      const settle = () => (fail ? reject(new Error('No connection')) : resolve(answer()));
      if (this.latency === 0) queueMicrotask(settle);
      else setTimeout(settle, this.latency);
    });
  }
}

export type LoadState = 'idle' | 'loading' | 'refreshing' | 'failed';

let created = 0;

/**
 * Every project, task and comment, for every screen at once: the list, the task, the person and
 * the editor all read the one copy, so a change made on any of them is on all of them.
 *
 * Changes are optimistic. The store changes first and the server is told after; if the server
 * refuses, the store goes back to what the server last said and `notice` says why.
 */
@Service()
export class ProjectStore {
  private readonly server = inject(ProjectServer);

  readonly projects = signal<readonly Project[]>([]);
  readonly tasks = signal<ReadonlyMap<string, Task>>(new Map());
  readonly comments = signal<readonly TaskComment[]>([]);
  readonly state = signal<LoadState>('idle');
  readonly notice = signal<string | null>(null);
  /** What the server last confirmed, per task, to roll a failed change back to. */
  private readonly confirmed = new Map<string, Task | null>();
  /**
   * Local changes the server has not answered yet: a task saved, or null for one deleted. A
   * refresh that lands in the meantime brings the server's older copy, and these go back over it.
   */
  private readonly pending = new Map<string, Task | null>();

  readonly loaded = computed(() => this.projects().length > 0);

  /** Load everything the first time, or refresh it from the server. */
  async load(): Promise<void> {
    if (this.state() === 'loading' || this.state() === 'refreshing') return;
    this.state.set(this.loaded() ? 'refreshing' : 'loading');
    try {
      const [projects, tasks, comments] = await Promise.all([
        this.server.projects(),
        this.server.tasks(),
        this.server.comments(),
      ]);
      this.projects.set(projects);
      const merged = new Map(tasks.map((task) => [task.id, task]));
      for (const [id, local] of this.pending) {
        if (local) merged.set(id, local);
        else merged.delete(id);
      }
      this.tasks.set(merged);
      this.comments.set(comments);
      this.confirmed.clear();
      for (const task of tasks) this.confirmed.set(task.id, task);
      this.state.set('idle');
    } catch {
      this.state.set('failed');
    }
  }

  /** Load once, for a screen reached directly - by a deep link, say - before the list was. */
  ensureLoaded(): void {
    if (!this.loaded() && this.state() === 'idle') void this.load();
  }

  project(id: string): Project | undefined {
    return this.projects().find((project) => project.id === id);
  }

  tasksOf(projectId: string): Task[] {
    return [...this.tasks().values()].filter((task) => task.projectId === projectId);
  }

  task(id: string): Task | undefined {
    return this.tasks().get(id);
  }

  commentsOf(taskId: string): TaskComment[] {
    return this.comments().filter((comment) => comment.taskId === taskId);
  }

  comment(id: string): TaskComment | undefined {
    return this.comments().find((comment) => comment.id === id);
  }

  /** A task the user has only just started, which exists nowhere until it is saved. */
  draft(projectId: string): Task {
    return {
      id: `n${Date.now().toString(36)}${++created}`,
      projectId,
      title: '',
      notes: '',
      done: false,
      assignee: PEOPLE[0]!.id,
      version: 0,
    };
  }

  toggleDone(id: string): void {
    const task = this.task(id);
    if (task) void this.save({ ...task, done: !task.done });
  }

  /** Save a new task or a change to one; the store has it at once, the server a moment later. */
  async save(task: Task): Promise<void> {
    if (!this.confirmed.has(task.id)) this.confirmed.set(task.id, null);
    this.pending.set(task.id, task);
    this.put(task);
    try {
      const stored = await this.server.save(task);
      this.confirmed.set(stored.id, stored);
      // A later local change supersedes this answer; only adopt it if nothing moved since.
      if (this.pending.get(task.id) !== task) return;
      this.pending.delete(task.id);
      this.put(stored);
    } catch {
      if (this.pending.get(task.id) !== task) return;
      this.pending.delete(task.id);
      this.rollBack(task.id, 'Could not save the task');
    }
  }

  duplicate(id: string): Task | undefined {
    const task = this.task(id);
    if (!task) return undefined;
    const copy = {
      ...this.draft(task.projectId),
      title: `${task.title} (copy)`,
      notes: task.notes,
    };
    void this.save(copy);
    return copy;
  }

  async remove(id: string): Promise<void> {
    const task = this.task(id);
    if (!task) return;
    this.pending.set(id, null);
    this.tasks.update((tasks) => {
      const next = new Map(tasks);
      next.delete(id);
      return next;
    });
    try {
      await this.server.remove(id);
      this.confirmed.delete(id);
      this.pending.delete(id);
    } catch {
      this.pending.delete(id);
      this.rollBack(id, 'Could not delete the task');
    }
  }

  dismissNotice(): void {
    this.notice.set(null);
  }

  private put(task: Task): void {
    this.tasks.update((tasks) => new Map(tasks).set(task.id, task));
  }

  private rollBack(id: string, message: string): void {
    const confirmed = this.confirmed.get(id);
    this.tasks.update((tasks) => {
      const next = new Map(tasks);
      if (confirmed) next.set(id, confirmed);
      else next.delete(id);
      return next;
    });
    this.notice.set(message);
  }
}
