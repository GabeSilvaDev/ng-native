/**
 * The offline guide's worked example (`apps/documentation/src/content/guide/offline.md`), pulled
 * straight out of the guide's markdown and run for real - not copied here by hand, so an edit to
 * the guide that breaks the pattern breaks this test rather than shipping quietly.
 *
 * What the guide used to get wrong: `loadFromCache()` and `add()` awaited `notesDb.ready()` with
 * no `try`/`catch`, and `Database` rejects rather than standing in quietly without `expo-sqlite` -
 * exactly the platform this test runs on. The old `add()` never resolved, so its queue write was
 * lost with an unhandled rejection; the fixed one keeps the queue in memory and treats every
 * SQLite call as best-effort, so it works whether or not `expo-sqlite` is there to ask.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Type } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Network } from '@ng-native/expo/network';
import { render } from '@ng-native/testing';
import { of, type Observable } from 'rxjs';

interface Note {
  readonly id: string;
  readonly body: string;
  readonly updatedAt: number;
}

interface GuideNotes {
  readonly notes: () => readonly Note[];
  add(body: string): Promise<void>;
  refresh(): Promise<void>;
}

/** Pulls a fenced ```ts block out of the guide by the `// <file>` comment its first line carries. */
function extractBlock(markdown: string, file: string): string {
  const marker = `// ${file}\n`;
  const start = markdown.indexOf(marker);
  assert.ok(start !== -1, `${file} not found in the offline guide`);
  const end = markdown.indexOf('\n```', start);
  assert.ok(end !== -1, `${file}'s closing fence not found in the offline guide`);
  return markdown.slice(start, end);
}

/** A fixed `Network.SOURCE`, so a test controls connectivity without a device. */
function networkSource(connected: boolean) {
  return {
    current: async () => ({ connected, type: connected ? 'wifi' : 'none', reachable: connected }),
    subscribe: () => () => {},
  };
}

/** Enough of `HttpClient` for the guide's service: a `get` and a `post`, faked. */
function fakeHttp(handlers: {
  get?: () => Observable<Note[]>;
  post?: (body: unknown) => Observable<unknown>;
}): Pick<HttpClient, 'get' | 'post'> {
  return {
    get: (handlers.get ?? (() => of([]))) as unknown as HttpClient['get'],
    post: ((_url: string, body: unknown) =>
      (handlers.post ?? (() => of(undefined)))(body)) as HttpClient['post'],
  };
}

describe("the offline guide's worked example, extracted and compiled for real", () => {
  let Notes: Type<GuideNotes>;
  let Harness: Type<unknown>;
  let directory: string;

  before(async () => {
    const guidePath = fileURLToPath(
      new URL('../../apps/documentation/src/content/guide/offline.md', import.meta.url),
    );
    const markdown = readFileSync(guidePath, 'utf8');
    // Inside this package, not the system tmp directory: Node resolves a bare specifier
    // ('@angular/core', 'rxjs', ...) by walking up from the importing file looking for
    // node_modules, which a directory outside the workspace has none of.
    const here = fileURLToPath(new URL('.', import.meta.url));
    directory = mkdtempSync(path.join(here, '.offline-guide-'));
    writeFileSync(path.join(directory, 'notes-db.ts'), extractBlock(markdown, 'notes-db.ts'));
    writeFileSync(path.join(directory, 'notes.ts'), extractBlock(markdown, 'notes.ts'));

    const mod = (await import(pathToFileURL(path.join(directory, 'notes.ts')).href)) as {
      Notes: Type<GuideNotes>;
    };
    Notes = mod.Notes;

    // An empty host, just so `render()` gives the service a real app injector - with a real
    // `effect()` scheduler - to live in, the way `mount()` gives it one in an actual app. Written
    // out and imported rather than declared here: this file is a `.test.ts`, which the Angular
    // hook this suite registers skips compiling, on purpose (see `register-linker.mjs`).
    writeFileSync(
      path.join(directory, 'harness.ts'),
      "import { Component } from '@angular/core';\n" +
        "@Component({ selector: 'offline-guide-harness', template: '' })\n" +
        'export class Harness {}\n',
    );
    const harnessMod = (await import(pathToFileURL(path.join(directory, 'harness.ts')).href)) as {
      Harness: Type<unknown>;
    };
    Harness = harnessMod.Harness;
  });

  after(() => rmSync(directory, { recursive: true, force: true }));

  async function build(options: {
    connected?: boolean;
    get?: () => Observable<Note[]>;
    post?: (body: unknown) => Observable<unknown>;
  }): Promise<GuideNotes> {
    const { componentRef } = await render(Harness, {
      providers: [
        { provide: HttpClient, useValue: fakeHttp(options) },
        { provide: Network.SOURCE, useValue: networkSource(options.connected ?? false) },
      ],
    });
    return componentRef.injector.get(Notes);
  }

  it('queues a note added with no connection and no expo-sqlite, rather than losing it', async () => {
    const notes = await build({ connected: false });
    await assert.doesNotReject(() => notes.add('Milk and eggs'));
    assert.equal(notes.notes().length, 1);
    assert.equal(notes.notes()[0]?.body, 'Milk and eggs');
  });

  it('flushes the queued note once refresh runs, with no expo-sqlite to persist it through', async () => {
    const posted: unknown[] = [];
    const notes = await build({
      connected: true,
      post: (body) => {
        posted.push(body);
        return of(undefined);
      },
    });

    await notes.add('Milk and eggs');
    await notes.refresh();

    assert.equal(posted.length, 1, 'the queued write reached the fake server');
    assert.equal((posted[0] as { body?: string }).body, 'Milk and eggs');
  });

  it("keeps a note still queued when the server's list does not include it yet", async () => {
    const notes = await build({
      connected: true,
      get: () => of([{ id: 'server-1', body: 'From the server', updatedAt: 1 }]),
      post: () => {
        throw new Error('the fake server rejected the write');
      },
    });

    await notes.add('Milk and eggs');
    await notes.refresh();

    const bodies = notes.notes().map((note) => note.body);
    assert.ok(bodies.includes('Milk and eggs'), 'the pending note was not dropped by the merge');
    assert.ok(bodies.includes('From the server'), "the server's note is in the merged list");
  });
});
