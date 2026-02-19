import { EsimProvisioningError } from '../EsimProvisioningError';

describe('EsimProvisioningError', () => {
  it('is an instance of Error', () => {
    const error = new EsimProvisioningError('UNSUPPORTED', 'not supported');
    expect(error).toBeInstanceOf(Error);
  });

  it('is an instance of EsimProvisioningError', () => {
    const error = new EsimProvisioningError('UNSUPPORTED', 'not supported');
    expect(error).toBeInstanceOf(EsimProvisioningError);
  });

  it('sets name to EsimProvisioningError', () => {
    const error = new EsimProvisioningError('NO_DATA', 'missing data');
    expect(error.name).toBe('EsimProvisioningError');
  });

  it.each([
    ['UNSUPPORTED', 'device not supported'] as const,
    ['USER_CANCELED', 'user canceled'] as const,
    ['INSTALL_FAILED', 'install failed'] as const,
    ['LINK_FAILED', 'link failed'] as const,
    ['NO_DATA', 'no data'] as const,
  ])('stores code %s and message', (code, message) => {
    const error = new EsimProvisioningError(code, message);
    expect(error.code).toBe(code);
    expect(error.message).toBe(message);
  });
});
