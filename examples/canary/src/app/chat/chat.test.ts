import { Keyboard, type KeyboardMetrics } from '@ng-native/device';
import { provideNativeRouter } from '@ng-native/router';
import {
  fireEvent,
  render,
  screen,
  settle,
  userEvent,
  waitFor,
  type FakeFabric,
  type FakeFabricNode,
} from '@ng-native/testing';
import { describe, expect, test } from 'vitest';
import { ChatBackend } from './chat-backend.ts';
import { ChatStore } from './chat-store.ts';
import { ChatPage } from './chat.ts';

const flatten = (nodes: readonly FakeFabricNode[]): FakeFabricNode[] =>
  nodes.flatMap((node) => [node, ...flatten(node.children)]);

/** A keyboard a test can raise and lower. */
function fakeKeyboard() {
  const listeners = new Set<(metrics: KeyboardMetrics) => void>();
  return {
    source: {
      subscribe: (listener: (metrics: KeyboardMetrics) => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      dismiss: () => listeners.forEach((listener) => listener({ height: 0 })),
    },
    move: (metrics: KeyboardMetrics) => listeners.forEach((listener) => listener(metrics)),
  };
}

async function boot() {
  const backend = new ChatBackend();
  backend.latency = 0;
  const keyboard = fakeKeyboard();
  const rendered = await render(ChatPage, {
    providers: [
      provideNativeRouter([]),
      { provide: ChatBackend, useValue: backend },
      { provide: Keyboard.SOURCE, useValue: keyboard.source },
    ],
  });
  const { fabric } = rendered;
  const store = rendered.componentRef.injector.get(ChatStore);
  const list = () => fabric.find('ScrollView')!;
  await waitFor(() => expect(store.messages().length).toBeGreaterThan(0));
  await fireEvent(list(), 'layout', { layout: { width: 400, height: 700 } });
  const scroll = (y: number) => fireEvent.scroll(list(), { contentOffset: { y } });
  const texts = () =>
    flatten(fabric.committed)
      .map((node) => node.props['text'])
      .filter((text): text is string => typeof text === 'string');
  return { ...rendered, backend, keyboard, store, list, scroll, texts };
}

const scrolls = (fabric: FakeFabric) =>
  fabric.commands.filter((command) => command.name === 'scrollTo');

describe('chat', () => {
  test('draws the newest message at the bottom of an inverted transcript', async () => {
    const { store, list } = await boot();
    expect(store.messages()[0]!.id).toBe('h2999');
    expect(list().props['transform']).toEqual([{ scaleY: -1 }]);
    expect(list().props['keyboardDismissMode']).toBe('interactive');
  });

  test('loads each page of older messages once, however often the top is reached', async () => {
    const { store, scroll, backend } = await boot();
    backend.latency = 30;
    const top = store.messages().length * 80;
    for (let i = 0; i < 15; i++) void scroll(top - i);
    await settle();
    await waitFor(() => expect(store.loadingOlder()).toBe(false));
    expect(store.historyRequests).toBe(2);
    expect(store.messages()).toHaveLength(80);
  });

  test('sends, and keeps the composer focused and empty for the next message', async () => {
    const { store, fabric } = await boot();
    const field = screen.getByLabelText('Message');
    await fireEvent(field, 'focus', {});
    await userEvent.type(field, 'On my way');
    await userEvent.press(screen.getByRole('button', { name: 'Send' }));
    expect(store.messages()[0]!.text).toBe('On my way');
    await waitFor(() => expect(store.messages()[0]!.state).toBe('sent'));
    expect(screen.getByLabelText('Message').props['text']).toBe('');
    expect(fabric.commands.some((command) => command.name === 'blur')).toBe(false);
  });

  test('marks a message that did not send, and sends it again on a tap', async () => {
    const { store, backend } = await boot();
    backend.offline = true;
    store.send('Are you there?');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Not delivered. Retry sending Are you there?' })),
    );
    backend.offline = false;
    await userEvent.press(
      screen.getByRole('button', { name: 'Not delivered. Retry sending Are you there?' }),
    );
    await waitFor(() => expect(store.messages()[0]!.state).toBe('sent'));
  });

  test('shows Sam typing, then the reply at the bottom', async () => {
    const { store, texts } = await boot();
    store.receive(20);
    await settle();
    expect(texts()).toContain('Sam is typing');
    await waitFor(() => expect(store.typing()).toBe(false));
    expect(store.messages()[0]!.from).toBe('sam');
    expect(texts()).not.toContain('Sam is typing');
  });

  test('holds the message being read when replies arrive, and offers a way back', async () => {
    const { store, scroll, fabric } = await boot();
    await scroll(1500);
    const before = scrolls(fabric).length;
    store.receive(0);
    await waitFor(() => expect(scrolls(fabric).length).toBeGreaterThan(before));
    const corrections = scrolls(fabric).slice(before);
    expect(corrections).toHaveLength(1);
    expect(corrections[0]!.args[1]).toBeGreaterThan(1500);
    const jump = await screen.findByRole('button', { name: '1 new messages' });
    await userEvent.press(jump);
    expect(scrolls(fabric).at(-1)!.args).toEqual([0, 0, true]);
  });

  test('follows a reply without holding position when at the newest message', async () => {
    const { store, fabric } = await boot();
    const before = scrolls(fabric).length;
    store.receive(0);
    const reply = await waitFor(() => {
      expect(store.messages()[0]!.from).toBe('sam');
      return store.messages()[0]!.text;
    });
    await screen.findAllByText(reply);
    expect(scrolls(fabric).slice(before)).toEqual([]);
  });

  test('keeps the newest message clear of the composer and the keyboard', async () => {
    const { fabric, list } = await boot();
    // The composer is in flow under the transcript, not over it, and the transcript rises with
    // it as the keyboard does, inside a frame that clips what rises past the top.
    const screen = flatten(fabric.committed).find((node) =>
      node.children.some((child) => child.props['overflow'] === 'hidden'),
    )!;
    const frame = screen.children.findIndex((child) => child.props['overflow'] === 'hidden');
    const dock = screen.children.findIndex((child) =>
      flatten([child]).some((node) => node.props['accessibilityLabel'] === 'Message'),
    );
    expect(dock).toBeGreaterThan(frame);
    expect(screen.children[dock]!.props['position']).toBeUndefined();
    expect(flatten([screen.children[frame]!])).toContain(list());
  });
});
