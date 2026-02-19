const mockPlatform = { OS: 'android' as string, Version: 30 as string | number };
const mockCanOpenURL = jest.fn();
const mockOpenURL = jest.fn();
const mockNativeModule = {
  isEsimSupported: jest.fn(),
  install: jest.fn(),
  scanQrCode: jest.fn(),
};

jest.mock('../EsimProvisioningModule', () => ({ default: mockNativeModule }));

jest.mock('react-native', () => ({
  Platform: mockPlatform,
  Linking: { canOpenURL: mockCanOpenURL, openURL: mockOpenURL },
}));

const { EsimProvisioningError } = require('../EsimProvisioningError') as typeof import('../EsimProvisioningError');
const { installEsim, isEsimSupported } = require('../index') as typeof import('../index');

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatform.OS = 'android';
  mockPlatform.Version = 30;
});

describe('isEsimSupported', () => {
  describe('iOS', () => {
    beforeEach(() => {
      mockPlatform.OS = 'ios';
    });

    it('returns true on iOS 18', () => {
      mockPlatform.Version = '18.0';
      expect(isEsimSupported()).toBe(true);
    });

    it('returns true on iOS 17.4 exactly', () => {
      mockPlatform.Version = '17.4';
      expect(isEsimSupported()).toBe(true);
    });

    it('returns false on iOS 17.3', () => {
      mockPlatform.Version = '17.3';
      expect(isEsimSupported()).toBe(false);
    });
  });

  describe('Android', () => {
    beforeEach(() => {
      mockPlatform.OS = 'android';
    });

    it('returns true when native module reports supported', () => {
      mockNativeModule.isEsimSupported.mockReturnValue(true);
      expect(isEsimSupported()).toBe(true);
    });

    it('returns false when native module reports not supported', () => {
      mockNativeModule.isEsimSupported.mockReturnValue(false);
      expect(isEsimSupported()).toBe(false);
    });

    it('returns false when native module throws', () => {
      mockNativeModule.isEsimSupported.mockImplementation(() => {
        throw new Error('native crash');
      });
      expect(isEsimSupported()).toBe(false);
    });
  });

  it('returns false on web', () => {
    mockPlatform.OS = 'web';
    expect(isEsimSupported()).toBe(false);
  });
});

describe('installEsim — activation data validation', () => {
  it('throws NO_DATA when no fields provided', async () => {
    await expect(installEsim({})).rejects.toMatchObject({ code: 'NO_DATA' });
  });

  it('throws NO_DATA when only smdpAddress is provided', async () => {
    await expect(installEsim({ smdpAddress: 'smdp.example.com' })).rejects.toMatchObject({
      code: 'NO_DATA',
    });
  });

  it('throws NO_DATA when only activationCode is provided', async () => {
    await expect(installEsim({ activationCode: 'ABC123' })).rejects.toMatchObject({
      code: 'NO_DATA',
    });
  });

  it('throws EsimProvisioningError instance for NO_DATA', async () => {
    await expect(installEsim({})).rejects.toBeInstanceOf(EsimProvisioningError);
  });
});

describe('installEsim — unsupported platform', () => {
  it('throws UNSUPPORTED on web', async () => {
    mockPlatform.OS = 'web';
    await expect(installEsim({ lpaString: 'LPA:1$test$code' })).rejects.toMatchObject({
      code: 'UNSUPPORTED',
    });
  });
});

describe('installEsim — iOS', () => {
  beforeEach(() => {
    mockPlatform.OS = 'ios';
    mockCanOpenURL.mockResolvedValue(true);
    mockOpenURL.mockResolvedValue(undefined);
  });

  it('opens esimsetup.apple.com via Linking', async () => {
    await installEsim({ smdpAddress: 'smdp.example.com', activationCode: 'ABC' });
    expect(mockOpenURL).toHaveBeenCalledWith(expect.stringContaining('esimsetup.apple.com'));
  });

  it('includes the encoded activation string in the URL', async () => {
    await installEsim({ smdpAddress: 'smdp.example.com', activationCode: 'ABC' });
    const url: string = mockOpenURL.mock.calls[0][0];
    expect(url).toContain(encodeURIComponent('LPA:1$smdp.example.com$ABC'));
  });

  it('uses lpaString directly when provided', async () => {
    await installEsim({ lpaString: 'LPA:1$explicit.com$XYZ' });
    const url: string = mockOpenURL.mock.calls[0][0];
    expect(url).toContain(encodeURIComponent('LPA:1$explicit.com$XYZ'));
  });

  it('throws UNSUPPORTED when canOpenURL returns false', async () => {
    mockCanOpenURL.mockResolvedValue(false);
    await expect(installEsim({ lpaString: 'LPA:1$explicit.com$XYZ' })).rejects.toMatchObject({
      code: 'UNSUPPORTED',
    });
  });

  it('throws LINK_FAILED when openURL throws', async () => {
    mockOpenURL.mockRejectedValue(new Error('cannot open'));
    await expect(installEsim({ lpaString: 'LPA:1$explicit.com$XYZ' })).rejects.toMatchObject({
      code: 'LINK_FAILED',
    });
  });
});

describe('installEsim — Android', () => {
  beforeEach(() => {
    mockPlatform.OS = 'android';
    mockNativeModule.install.mockResolvedValue('OK');
  });

  it('resolves when native install succeeds', async () => {
    await expect(installEsim({ smdpAddress: 'smdp.example.com', activationCode: 'ABC' })).resolves.toBe('OK');
  });

  it('passes the full LPA string to the native module', async () => {
    await installEsim({ smdpAddress: 'smdp.example.com', activationCode: 'ABC' });
    expect(mockNativeModule.install).toHaveBeenCalledWith('LPA:1$smdp.example.com$ABC');
  });

  it('throws USER_CANCELED when native module reports cancellation', async () => {
    const nativeError = Object.assign(new Error('canceled'), { code: 'USER_CANCELED' });
    mockNativeModule.install.mockRejectedValue(nativeError);
    await expect(installEsim({ smdpAddress: 'smdp.example.com', activationCode: 'ABC' })).rejects.toMatchObject({
      code: 'USER_CANCELED',
    });
  });

  it('throws UNSUPPORTED when native module reports UNSUPPORTED_ERROR', async () => {
    const nativeError = Object.assign(new Error('unsupported'), { code: 'UNSUPPORTED_ERROR' });
    mockNativeModule.install.mockRejectedValue(nativeError);
    await expect(installEsim({ smdpAddress: 'smdp.example.com', activationCode: 'ABC' })).rejects.toMatchObject({
      code: 'UNSUPPORTED',
    });
  });

  it('throws INSTALL_FAILED for unknown native errors', async () => {
    mockNativeModule.install.mockRejectedValue(new Error('unknown error'));
    await expect(installEsim({ smdpAddress: 'smdp.example.com', activationCode: 'ABC' })).rejects.toMatchObject({
      code: 'INSTALL_FAILED',
    });
  });
});
