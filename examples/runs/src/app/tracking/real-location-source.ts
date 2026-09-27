import { EnvironmentInjector, Service, effect, inject, runInInjectionContext } from '@angular/core';
import { Location } from '@ng-native/expo/location';
import type { LocationFix, LocationSource } from './location-source.ts';

/**
 * The device's own GPS, through `Location`. `Location.start()` follows the position into a
 * signal rather than a callback, so this bridges the two with an `effect`, run in the app's own
 * injection context since a plain service has none of its own.
 */
@Service()
export class RealLocationSource implements LocationSource {
  private readonly location = inject(Location);
  private readonly injector = inject(EnvironmentInjector);

  start(onFix: (fix: LocationFix) => void): () => void {
    let stopWatch = () => {};
    let stopped = false;

    const stopEffect = runInInjectionContext(this.injector, () =>
      effect(() => {
        const position = this.location.position();
        if (position) {
          onFix({
            latitude: position.latitude,
            longitude: position.longitude,
            altitude: position.altitude,
            timestamp: position.timestamp,
          });
        }
      }),
    );

    void this.location.start({ accuracy: 'high', distance: 5 }).then((stop) => {
      if (stopped) {
        stop();
        return;
      }
      stopWatch = stop;
    });

    return () => {
      stopped = true;
      stopWatch();
      stopEffect.destroy();
    };
  }
}
