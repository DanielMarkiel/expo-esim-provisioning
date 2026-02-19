import type { EsimProvisioningErrorCode } from './types';

/**
 * Error thrown by eSIM provisioning functions.
 *
 * Always contains a machine-readable `code` for programmatic handling.
 *
 * @example
 * ```ts
 * try {
 *   await installEsim({ lpaString: '...' });
 * } catch (error) {
 *   if (error instanceof EsimProvisioningError) {
 *     switch (error.code) {
 *       case 'USER_CANCELED': break;
 *       case 'UNSUPPORTED':   break;
 *       case 'INSTALL_FAILED': break;
 *     }
 *   }
 * }
 * ```
 */
export class EsimProvisioningError extends Error {
  readonly code: EsimProvisioningErrorCode;

  constructor(code: EsimProvisioningErrorCode, message: string) {
    super(message);
    this.name = 'EsimProvisioningError';
    this.code = code;
  }
}
