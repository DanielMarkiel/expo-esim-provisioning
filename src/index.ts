import { Linking, Platform } from 'react-native';

import { EsimProvisioningError } from './EsimProvisioningError';
import type { EsimProvisioningData, EsimProvisioningNativeModule } from './types';

export { EsimProvisioningError } from './EsimProvisioningError';
export type { EsimProvisioningData, EsimProvisioningErrorCode, EsimProvisioningNativeModule } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const APPLE_ESIM_UNIVERSAL_LINK = 'https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=';

const IOS_MIN_VERSION = 17.4;

// ---------------------------------------------------------------------------
// Android native module (lazy-loaded to avoid crash on iOS)
// ---------------------------------------------------------------------------

let _androidModule: EsimProvisioningNativeModule | null | undefined;

function getAndroidModule(): EsimProvisioningNativeModule | null {
  if (Platform.OS !== 'android') return null;
  if (_androidModule !== undefined) return _androidModule;
  try {
    const bridge = require('./EsimProvisioningModule');
    _androidModule = bridge.default ?? null;
  } catch {
    _androidModule = null;
  }
  return _androidModule ?? null;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Build an LPA activation string from provisioning data.
 *
 * Returns `lpaString` as-is when provided, otherwise constructs
 * `LPA:1$<smdpAddress>$<activationCode>` from the individual fields.
 *
 * @returns The LPA string, or `null` if insufficient data.
 *
 * @example
 * ```ts
 * buildActivationString({ smdpAddress: 'smdp.example.com', activationCode: 'ABC123' });
 * // → "LPA:1$smdp.example.com$ABC123"
 *
 * buildActivationString({ lpaString: 'LPA:1$smdp.example.com$ABC123' });
 * // → "LPA:1$smdp.example.com$ABC123"
 * ```
 */
export function buildActivationString(data: EsimProvisioningData): string | null {
  if (data.lpaString) return data.lpaString;
  if (data.smdpAddress && data.activationCode) {
    return `LPA:1$${data.smdpAddress}$${data.activationCode}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// isEsimSupported
// ---------------------------------------------------------------------------

/**
 * Check whether the device supports eSIM provisioning.
 *
 * - **Android:** Checks `EuiccManager.isEnabled` via the native module (API 28+).
 * - **iOS:** Returns `true` on iOS 17.4+ (Universal Link approach).
 * - **Other:** Returns `false`.
 *
 * @example
 * ```ts
 * import { isEsimSupported } from 'expo-esim-provisioning';
 *
 * if (isEsimSupported()) {
 *   // show "Install eSIM" button
 * } else {
 *   // show QR code / manual instructions
 * }
 * ```
 */
export function isEsimSupported(): boolean {
  if (Platform.OS === 'ios') {
    return parseFloat(String(Platform.Version)) >= IOS_MIN_VERSION;
  }

  if (Platform.OS === 'android') {
    const mod = getAndroidModule();
    if (!mod) return false;
    try {
      return mod.isEsimSupported();
    } catch {
      return false;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// installEsim (high-level, cross-platform)
// ---------------------------------------------------------------------------

/**
 * Trigger eSIM installation on the device.
 *
 * **iOS (17.4+):** Opens the Apple eSIM Setup Universal Link, which presents
 * the native eSIM installation modal. The app goes to background — use
 * `AppState` to detect when the user returns.
 *
 * **Android:** Launches the system eSIM activation UI via `EuiccManager`.
 * Samsung devices (Android 11+) get the Samsung-specific activation screen.
 * Returns a promise that resolves on success or rejects on failure.
 *
 * @param data - eSIM provisioning data. Provide either `lpaString` or
 *   `smdpAddress` + `activationCode`.
 * @returns A success message string.
 * @throws {EsimProvisioningError} with a `code` property for programmatic handling.
 *
 * @example
 * ```ts
 * import { installEsim, EsimProvisioningError } from 'expo-esim-provisioning';
 *
 * try {
 *   await installEsim({
 *     smdpAddress: 'smdp.example.com',
 *     activationCode: 'ABC-123',
 *   });
 * } catch (error) {
 *   if (error instanceof EsimProvisioningError) {
 *     console.log(error.code, error.message);
 *   }
 * }
 * ```
 */
export async function installEsim(data: EsimProvisioningData): Promise<string> {
  const activationString = buildActivationString(data);
  if (!activationString) {
    throw new EsimProvisioningError('NO_DATA', 'eSIM activation data is missing or incomplete');
  }

  if (Platform.OS === 'ios') {
    return installEsimIos(activationString);
  }

  if (Platform.OS === 'android') {
    return installEsimAndroid(activationString);
  }

  throw new EsimProvisioningError('UNSUPPORTED', 'eSIM provisioning is not supported on this platform');
}

// ---------------------------------------------------------------------------
// Low-level functions (Android-only native calls)
// ---------------------------------------------------------------------------

/**
 * Launch the Android system eSIM activation UI with a raw LPA activation code.
 *
 * For most use-cases prefer {@link installEsim} which handles both platforms
 * and builds the activation string from structured data.
 *
 * @param activationCode - Full LPA string. The `LPA:` prefix is added if missing.
 * @throws {EsimProvisioningError}
 */
export async function install(activationCode: string): Promise<string> {
  const mod = getAndroidModule();
  if (!mod) {
    throw new EsimProvisioningError('UNSUPPORTED', 'eSIM native module is not available');
  }
  return wrapAndroidCall(() => mod.install(activationCode));
}

/**
 * Launch the system QR code scanner for eSIM provisioning (Android).
 *
 * Primarily supported on Samsung devices running Android 11+.
 * On other devices it falls back to the generic eSIM activation intent.
 *
 * @throws {EsimProvisioningError}
 */
export async function scanQrCode(): Promise<string> {
  const mod = getAndroidModule();
  if (!mod) {
    throw new EsimProvisioningError('UNSUPPORTED', 'eSIM native module is not available');
  }
  return wrapAndroidCall(() => mod.scanQrCode());
}

// ---------------------------------------------------------------------------
// Internal: iOS
// ---------------------------------------------------------------------------

async function installEsimIos(activationString: string): Promise<string> {
  const url = `${APPLE_ESIM_UNIVERSAL_LINK}${encodeURIComponent(activationString)}`;

  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    throw new EsimProvisioningError(
      'UNSUPPORTED',
      'Cannot open eSIM setup. Ensure your device runs iOS 17.4 or later.',
    );
  }

  try {
    await Linking.openURL(url);
    return 'eSIM setup opened on iOS';
  } catch (error) {
    throw new EsimProvisioningError(
      'LINK_FAILED',
      `Failed to open eSIM setup: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Internal: Android
// ---------------------------------------------------------------------------

async function installEsimAndroid(activationString: string): Promise<string> {
  const mod = getAndroidModule();
  if (!mod) {
    throw new EsimProvisioningError('UNSUPPORTED', 'eSIM native module is not available');
  }
  return wrapAndroidCall(() => mod.install(activationString));
}

async function wrapAndroidCall(fn: () => Promise<string>): Promise<string> {
  try {
    return await fn();
  } catch (error: unknown) {
    const errorObj = error as { code?: string; message?: string };
    const code = errorObj.code ?? '';

    if (code === 'USER_CANCELED') {
      throw new EsimProvisioningError('USER_CANCELED', 'eSIM installation was canceled');
    }
    if (code === 'UNSUPPORTED_ERROR') {
      throw new EsimProvisioningError('UNSUPPORTED', 'Device does not support eSIM');
    }

    throw new EsimProvisioningError('INSTALL_FAILED', `eSIM installation failed: ${errorObj.message ?? String(error)}`);
  }
}
