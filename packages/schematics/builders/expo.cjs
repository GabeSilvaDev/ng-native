/**
 * `@ng-native/schematics:expo`: an Expo CLI command, run in the project.
 *
 * `ng serve native` is `expo start`, `ng build native` is `expo export` and
 * `ng run native:run-ios` is `expo run:ios`. Nothing is translated: Metro builds an Angular Native
 * app, Expo drives Metro, and this is how `ng` reaches it.
 */
const { createBuilder } = require('@angular-devkit/architect');
const { spawnBin } = require('./spawn-bin.cjs');

/**
 * The Expo CLI's arguments for a target's options.
 *
 * @param {{ command: string, args?: string[], platform?: string, port?: number, clear?: boolean }} options
 */
function expoArgs(options) {
  const args = [options.command, ...(options.args ?? [])];
  if (options.platform) args.push('--platform', options.platform);
  if (options.port) args.push('--port', String(options.port));
  if (options.clear) args.push('--clear');
  return args;
}

module.exports = createBuilder((options, context) => spawnBin('expo', expoArgs(options), context));
module.exports.expoArgs = expoArgs;
