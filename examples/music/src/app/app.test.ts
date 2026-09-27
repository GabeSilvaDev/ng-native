import { render, screen, userEvent, within } from '@ng-native/testing';
import { expect, test } from 'vitest';
import { App } from './app.ts';
import { appConfig } from './app.config.ts';
import { TRACK_PLAYER, fakeTrackPlayer } from './player/track-player.ts';

// The same providers main.ts hands `mount()`, with one override: `expo-audio` is not installed
// under Vitest, and `audioPlayer()` throws rather than doing nothing when it is missing (see
// player.ts), so the real player is swapped for a fake one that behaves the same way a test cares
// about - it just has no decoder behind it.
const start = () =>
  render(App, {
    providers: [...appConfig.providers, { provide: TRACK_PLAYER, useValue: fakeTrackPlayer }],
  });

test('opens an album and starts playback, which shows the mini player', async () => {
  await start();
  await userEvent.press(await screen.findByRole('button', { name: 'Drift' }));

  expect(await screen.findByText('Low Tide')).toBeTruthy();
  await userEvent.press(await screen.findByRole('button', { name: 'Play all' }));

  const miniPlayer = within(await screen.findByTestId('mini-player'));
  expect(await miniPlayer.findByText('Low Tide')).toBeTruthy();
  expect(miniPlayer.getByRole('button', { name: 'Pause' })).toBeTruthy();
});

test('the mini player skips to the next track', async () => {
  await start();
  await userEvent.press(await screen.findByRole('button', { name: 'Drift' }));
  await userEvent.press(await screen.findByRole('button', { name: 'Play all' }));

  const miniPlayer = within(await screen.findByTestId('mini-player'));
  await userEvent.press(miniPlayer.getByRole('button', { name: 'Next' }));

  expect(await miniPlayer.findByText('Open Water')).toBeTruthy();
});

test('tapping a track in the album plays from there, not from the top', async () => {
  await start();
  await userEvent.press(await screen.findByRole('button', { name: 'Drift' }));
  const albumTracks = within(await screen.findByTestId('album-tracks'));
  await userEvent.press(albumTracks.getByRole('button', { name: /Undertow/ }));

  const miniPlayer = within(await screen.findByTestId('mini-player'));
  expect(await miniPlayer.findByText('Undertow')).toBeTruthy();
});

test('the mini player opens Now Playing, with transport controls of its own', async () => {
  await start();
  await userEvent.press(await screen.findByRole('button', { name: 'Drift' }));
  await userEvent.press(await screen.findByRole('button', { name: 'Play all' }));
  await userEvent.press(await screen.findByRole('button', { name: 'Now playing: Low Tide' }));

  const nowPlaying = within(await screen.findByTestId('now-playing'));
  expect(await nowPlaying.findByText('Low Tide')).toBeTruthy();
  expect(nowPlaying.getByRole('button', { name: 'Pause' })).toBeTruthy();

  await userEvent.press(nowPlaying.getByRole('button', { name: 'Next' }));
  expect(await nowPlaying.findByText('Open Water')).toBeTruthy();

  await userEvent.press(nowPlaying.getByRole('button', { name: 'Close' }));
  expect(await screen.findByRole('button', { name: 'Play all' })).toBeTruthy();
});

test('searching the library narrows the track list', async () => {
  await start();
  const search = await screen.findByTestId('search');
  const tracks = within(await screen.findByTestId('tracks'));
  expect(tracks.queryAllByText('First Light').length).toBeGreaterThan(0);

  await userEvent.type(search, 'blue hour');

  expect(tracks.queryAllByText('Blue Hour').length).toBeGreaterThan(0);
  expect(tracks.queryAllByText('First Light')).toHaveLength(0);
});
