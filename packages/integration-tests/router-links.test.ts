/**
 * A link into the app, with the page it belongs under put beneath it, so the stack a deep link
 * builds is the one the user would have walked: /settings/notifications opens on top of
 * /settings, and Back goes there.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { followLink } from '../router/src/native-links.ts';

function fakeRouter(url: string) {
  const visited: string[] = [];
  const router = {
    url,
    navigateByUrl: async (to: string) => {
      visited.push(to);
      router.url = to;
      return true;
    },
  };
  return { router, visited };
}

const underFirstSegment = (url: string) => {
  const [first, second] = url.split('?')[0]!.split('/').filter(Boolean);
  return first && second ? `/${first}` : null;
};

describe('following a link', () => {
  it('opens the page it belongs under first, then the link on top', async () => {
    const { router, visited } = fakeRouter('/dashboard');
    await followLink(router, '/settings/notifications', underFirstSegment);
    assert.deepEqual(visited, ['/settings', '/settings/notifications']);
  });

  it('keeps the query on the link, not on the page under it', async () => {
    const { router, visited } = fakeRouter('/dashboard');
    await followLink(router, '/properties/p3?tab=rent', underFirstSegment);
    assert.deepEqual(visited, ['/properties', '/properties/p3?tab=rent']);
  });

  it('pushes straight on when already on the page it belongs under', async () => {
    const { router, visited } = fakeRouter('/settings');
    await followLink(router, '/settings/about', underFirstSegment);
    assert.deepEqual(visited, ['/settings/about']);
  });

  it('goes straight there when the link has no parent', async () => {
    const { router, visited } = fakeRouter('/dashboard');
    await followLink(router, '/settings', underFirstSegment);
    assert.deepEqual(visited, ['/settings']);
  });

  it('does nothing for a link to where the user already is', async () => {
    const { router, visited } = fakeRouter('/settings/about');
    await followLink(router, '/settings/about', underFirstSegment);
    assert.deepEqual(visited, []);
  });
});
