/**
 * `ImagePicker`, bound to `expo-image-picker`.
 *
 * ```ts
 * private readonly picker = inject(ImagePicker);
 * const [photo] = await this.picker.pick({ mediaTypes: ['images'] });
 * ```
 *
 * The options are Expo's own, passed through unchanged. What this adds is the two things every
 * call site otherwise writes: a cancelled picker answers with no assets rather than a result to
 * unwrap, and `capture()` asks for the camera before opening it, where Expo's would reject.
 */
import { InjectionToken, Service, inject } from '@angular/core';
import { expoModule } from './native.ts';
import { Permission, type PermissionResponse } from './permissions.ts';

export type PickerOptions = import('expo-image-picker').ImagePickerOptions;
export type PickedAsset = import('expo-image-picker').ImagePickerAsset;

/** The slice of `expo-image-picker` this needs. */
export interface NativeImagePicker {
  launchImageLibraryAsync(options?: PickerOptions): Promise<PickerResult>;
  launchCameraAsync(options?: PickerOptions): Promise<PickerResult>;
  getMediaLibraryPermissionsAsync(): Promise<PermissionResponse>;
  requestMediaLibraryPermissionsAsync(): Promise<PermissionResponse>;
  getCameraPermissionsAsync(): Promise<PermissionResponse>;
  requestCameraPermissionsAsync(): Promise<PermissionResponse>;
}

interface PickerResult {
  readonly canceled: boolean;
  readonly assets: readonly PickedAsset[] | null;
}

/** What a permission is without the module: refused, and never to be asked about. */
const UNAVAILABLE = async (): Promise<PermissionResponse> => ({
  status: 'denied',
  granted: false,
  canAskAgain: false,
});

@Service()
export class ImagePicker {
  /** Overridden in a test to pick photos without a photo library. */
  static readonly SOURCE = new InjectionToken<NativeImagePicker | null>(
    'angular-native.imagePickerSource',
    {
      factory: () =>
        expoModule('expo-image-picker', () => require('expo-image-picker') as NativeImagePicker) ??
        null,
    },
  );

  private readonly native = inject(ImagePicker.SOURCE);

  /**
   * The photo library. The system picker needs no permission to pick from, so `pick()` never
   * asks; this is for an app that reads the library itself.
   */
  readonly libraryPermission = Permission.of(
    this.native?.getMediaLibraryPermissionsAsync ?? UNAVAILABLE,
    this.native?.requestMediaLibraryPermissionsAsync ?? UNAVAILABLE,
  );

  /** The camera, which `capture()` asks for itself. */
  readonly cameraPermission = Permission.of(
    this.native?.getCameraPermissionsAsync ?? UNAVAILABLE,
    this.native?.requestCameraPermissionsAsync ?? UNAVAILABLE,
  );

  /** Pick from the photo library. Empty if they cancelled. */
  async pick(options?: PickerOptions): Promise<readonly PickedAsset[]> {
    if (!this.native) return [];
    return assetsOf(await this.native.launchImageLibraryAsync(options));
  }

  /** Take a photo or video with the system camera. Empty if they cancelled or refused it. */
  async capture(options?: PickerOptions): Promise<readonly PickedAsset[]> {
    if (!this.native || !(await this.cameraPermission.ensure())) return [];
    return assetsOf(await this.native.launchCameraAsync(options));
  }
}

function assetsOf(result: PickerResult): readonly PickedAsset[] {
  return result.canceled ? [] : (result.assets ?? []);
}
