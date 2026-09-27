import { registerExpoUiViews } from '@ng-native/expo';
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
import { beforeAll, describe, expect, test } from 'vitest';
import { ApplicationPage } from './application.ts';
import { Usernames } from './application-form.ts';

beforeAll(() => registerExpoUiViews('ios'));

const flatten = (nodes: readonly FakeFabricNode[]): FakeFabricNode[] =>
  nodes.flatMap((node) => [node, ...flatten(node.children)]);

async function boot() {
  const usernames = new Usernames();
  usernames.latency = 5;
  const rendered = await render(ApplicationPage, {
    providers: [provideNativeRouter([]), { provide: Usernames, useValue: usernames }],
  });
  return { ...rendered, usernames };
}

const field = (label: string) => screen.getByLabelText(label);
const focusedFields = (fabric: FakeFabric) =>
  fabric.commands
    .filter((command) => command.name === 'focus')
    .map((command) => command.node?.props['accessibilityLabel']);

describe('application form', () => {
  test('asks for twenty-odd things', async () => {
    const { fabric } = await boot();
    const inputs = flatten(fabric.committed).filter((node) => node.viewName === 'TextInput');
    const toggles = flatten(fabric.committed).filter((node) => node.viewName === 'Switch');
    const pickers = flatten(fabric.committed).filter((node) =>
      /ExpoUI_(Picker|DatePicker)View$/.test(node.viewName),
    );
    expect(inputs.length + toggles.length).toBeGreaterThanOrEqual(15);
    expect(pickers.length).toBeGreaterThanOrEqual(2);
  });

  test('moves to the next field from the keyboard s Next key', async () => {
    const { fabric } = await boot();
    await fireEvent(field('First name'), 'submitEditing', { text: '' });
    await fireEvent(field('Postcode'), 'submitEditing', { text: '' });
    expect(focusedFields(fabric)).toEqual(['Last name', 'Username']);
  });

  test('re-renders only the field being typed in', async () => {
    const { fabric } = await boot();
    await userEvent.type(field('First name'), 'A');
    fabric.reset();
    await userEvent.type(field('First name'), 'd');
    // The field's text, its row's error, and the ancestors those re-clone through.
    expect(fabric.calls.createNode).toBe(0);
    expect(fabric.calls.cloneWithProps + fabric.calls.cloneWithChildren).toBeLessThan(12);
  });

  test('asks for a state, and a ZIP code by number, only in the US', async () => {
    const { instance } = await boot();
    expect(screen.queryByText('State')).toBeNull();
    instance.data.update((data) => ({ ...data, country: 'US' }));
    await settle();
    expect(screen.getByText('State')).toBeTruthy();
    expect(field('ZIP code').props['keyboardType']).toBe('number-pad');
  });

  test('shows how often only with the newsletter on, and texts only with a phone number', async () => {
    const { instance } = await boot();
    expect(screen.queryByText('How often')).toBeNull();
    expect(screen.getByText('Add a phone number to turn these on')).toBeTruthy();
    await fireEvent(field('Newsletter'), 'change', { value: true });
    expect(screen.getByText('How often')).toBeTruthy();
    await userEvent.type(field('Phone'), '0207 946 0000');
    expect(screen.queryByText('Add a phone number to turn these on')).toBeNull();
    expect(instance.f.sms().disabled()).toBe(false);
  });

  test('keeps what was typed for each dependant when one is removed', async () => {
    await boot();
    await userEvent.press(screen.getByRole('button', { name: 'Add a dependant' }));
    await userEvent.press(screen.getByRole('button', { name: 'Add a dependant' }));
    await userEvent.type(field('Dependant 1 name'), 'Alan');
    await userEvent.type(field('Dependant 2 name'), 'Bea');
    await userEvent.press(screen.getByRole('button', { name: 'Remove dependant 1' }));
    expect(field('Dependant 1 name').props['text']).toBe('Bea');
    expect(screen.queryByLabelText('Dependant 2 name')).toBeNull();
  });

  test('checks the username with the server once the user stops typing', async () => {
    const { usernames } = await boot();
    await userEvent.type(field('Username'), 'ada');
    await fireEvent(field('Username'), 'blur', {});
    await waitFor(() => expect(screen.getByText('That username is taken')).toBeTruthy(), {
      timeout: 2000,
    });
    expect(usernames.checks).toBe(1);
  });

  test('takes the user to the first thing to fix when the form is not ready', async () => {
    const { fabric } = await boot();
    await userEvent.press(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(focusedFields(fabric)).toEqual(['First name']));
    expect(screen.getByText('Enter your first name')).toBeTruthy();
    expect(screen.getByText('Accept the terms to continue')).toBeTruthy();
  });

  test('keeps a field s native view, and so its focus and cursor, while the form changes around it', async () => {
    const { instance } = await boot();
    const before = field('Email').reactTag;
    await fireEvent(field('Email'), 'focus', {});
    instance.data.update((data) => ({ ...data, country: 'US', newsletter: true }));
    await settle();
    expect(field('Email').reactTag).toBe(before);
  });
});
