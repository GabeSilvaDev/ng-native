# Runs

A small run tracker built with Angular Native: a live map, GPS tracking with splits, and a GPX
export, all built to run in the simulator without a real GPS.

| Screen                                          | What it shows                                                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Run (`src/app/run/run.ts`)                      | A live map that follows the route, big tabular numbers for time, distance and pace, and start/pause/finish controls |
| History (`src/app/history/history.ts`)          | Every past run, newest first, with its date, duration and pace                                                      |
| Run detail (`src/app/run-detail/run-detail.ts`) | The finished route on a map, splits per kilometre, and an export to GPX shared through the system share sheet       |
| Settings (`src/app/settings/settings.ts`)       | Kilometres or miles, persisted with `Storage`, and - in development - a switch to the simulated location source     |

## The two location sources

Every screen talks to `Tracking` (`src/app/tracking/tracking.ts`) through one `LocationSource`
interface (`src/app/tracking/location-source.ts`), never knowing which it has:

- `RealLocationSource` follows the device's GPS through `Location`.
- `SimulatedLocationSource` replays a recorded loop around Regent's Park
  (`src/app/tracking/simulated-route.ts`) on a timer, so the app - and its screenshots - show a
  run moving without a device or a permission dialog.

`LocationSourceSetting` (`src/app/settings/location-source-setting.ts`) picks between them: on by
default everywhere except a release build, and always available to flip in Settings.

The Run and detail screens draw the route with [Maps](/packages/expo/maps)' `<expo-map>`: a
polyline through the recorded fixes, a marker at the runner, and a camera that follows them.

## Run it

From the repository root, after `pnpm install`:

```sh
cd examples/runs
pnpm start     # press i or a - the maps, location and keep-awake modules need a native build
pnpm test      # Vitest in Node, no simulator
```

`src/app/app.test.ts` drives the whole app the way a person would: starts a run on the simulated
source, watches the stats move, finishes it, and finds it in History. `src/app/tracking/geo.test.ts`
covers the haversine distance, pace and per-kilometre splits on their own, with no Angular in the
picture, and `src/app/tracking/tracking.test.ts` drives `Tracking` itself against a fake location
source, including a pause and resume. `src/app/export/gpx.test.ts` checks the GPX file a run
exports.
