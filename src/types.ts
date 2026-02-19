/**
 * Error codes produced by the provisioning functions.
 *
 * | Code             | Meaning                                              |
 * |------------------|------------------------------------------------------|
 * | `UNSUPPORTED`    | Device lacks eSIM hardware, OS too old, or wrong platform |
 * | `USER_CANCELED`  | User dismissed the system eSIM activation UI          |
 * | `INSTALL_FAILED` | Native eSIM installation failed                       |
 * | `LINK_FAILED`    | iOS Universal Link could not be opened                |
 * | `NO_DATA`        | Activation data is missing or incomplete              |
 */
export type EsimProvisioningErrorCode = 'UNSUPPORTED' | 'USER_CANCELED' | 'INSTALL_FAILED' | 'LINK_FAILED' | 'NO_DATA';

/**
 * Input data for eSIM provisioning.
 *
 * Provide **either** `lpaString` (the full LPA activation string)
 * **or** both `smdpAddress` + `activationCode` (they will be combined
 * into an LPA string automatically: `LPA:1$<smdpAddress>$<activationCode>`).
 */
export type EsimProvisioningData = {
  /** Full LPA activation string, e.g. `"LPA:1$smdp.example.com$CODE"`. Takes precedence if set. */
  lpaString?: string | null;
  /** SM-DP+ server address, e.g. `"smdp.example.com"` */
  smdpAddress?: string | null;
  /** Activation code / matching ID */
  activationCode?: string | null;
};

/**
 * Shape of the Android native module exposed via Expo Modules API.
 *
 * @internal — consumers should use the public functions from the package root.
 */
export type EsimProvisioningNativeModule = {
  isEsimSupported(): boolean;
  install(activationCode: string): Promise<string>;
  scanQrCode(): Promise<string>;
};
