import { withComponentInputBinding } from '@angular/router';
import { NativeNavigation, provideNativeRouter } from '@ng-native/router';
import {
  fireEvent,
  render,
  screen,
  userEvent,
  type FakeFabric,
  type FakeFabricNode,
} from '@ng-native/testing';
import { describe, expect, test } from 'vitest';
import { App } from '../app.ts';
import { routes } from '../app.routes.ts';
import { STORIES, Viewer, after, before } from './stories-model.ts';

describe('the story order', () => {
  test('steps through a story, then into the next, and ends after the last', () => {
    expect(after({ story: 0, slide: 0 })).toEqual({ story: 0, slide: 1 });
    expect(after({ story: 0, slide: 1 })).toEqual({ story: 1, slide: 0 });
    expect(after({ story: STORIES.length - 1, slide: 1 })).toBeNull();
  });

  test('steps back into the previous story at its last slide, and stays at the very first', () => {
    expect(before({ story: 1, slide: 0 })).toEqual({ story: 0, slide: 1 });
    expect(before({ story: 0, slide: 0 })).toEqual({ story: 0, slide: 0 });
  });
});

const flatten = (nodes: readonly FakeFabricNode[]): FakeFabricNode[] =>
  nodes.flatMap((node) => [node, ...flatten(node.children)]);

async function watch(story: number) {
  const app = await render(App, {
    providers: [provideNativeRouter(routes, withComponentInputBinding())],
  });
  app.componentRef.injector.get(Viewer).open(story);
  await app.componentRef.injector
    .get(NativeNavigation)
    .present('/stories/view', { as: 'fullScreenModal' });
  return app;
}

/** The progress fill that is running: the one the current slide's time is drawn on. */
const running = (fabric: FakeFabric) =>
  flatten(fabric.committed).filter(
    (node) =>
      node.props['$animation'] === undefined &&
      node.children.length === 0 &&
      node.props['transformOrigin'] !== undefined,
  );

describe('stories', () => {
  test('moves on when the progress bar finishes, and taps step either way', async () => {
    const { fabric } = await watch(1);
    await screen.findByLabelText('New strings');
    const fills = running(fabric);
    expect(fills).toHaveLength(3);
    await fireEvent(fills[0]!, 'animationend', { animationName: 'progress' });
    await screen.findByLabelText('Gig on Friday');
    await userEvent.press(screen.getByRole('button', { name: 'Next' }));
    await screen.findByLabelText('After party');
    await userEvent.press(screen.getByRole('button', { name: 'Previous' }));
    await screen.findByLabelText('Gig on Friday');
  });

  test('closes after the last slide of the last story', async () => {
    const app = await watch(STORIES.length - 1);
    const viewer = app.componentRef.injector.get(Viewer);
    await screen.findByLabelText('Forty miles');
    await userEvent.press(screen.getByRole('button', { name: 'Next' }));
    await userEvent.press(screen.getByRole('button', { name: 'Next' }));
    expect(viewer.seen().has('tom')).toBe(true);
  });
});
