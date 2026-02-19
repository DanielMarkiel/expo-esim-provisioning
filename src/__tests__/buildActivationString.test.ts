import { buildActivationString } from '../index';

describe('buildActivationString', () => {
  it('returns lpaString as-is when provided', () => {
    expect(buildActivationString({ lpaString: 'LPA:1$smdp.example.com$CODE' })).toBe('LPA:1$smdp.example.com$CODE');
  });

  it('builds LPA string from smdpAddress and activationCode', () => {
    expect(buildActivationString({ smdpAddress: 'smdp.example.com', activationCode: 'ABC123' })).toBe(
      'LPA:1$smdp.example.com$ABC123',
    );
  });

  it('prefers lpaString over smdpAddress + activationCode', () => {
    expect(
      buildActivationString({
        lpaString: 'LPA:1$explicit.com$EXPLICIT',
        smdpAddress: 'smdp.example.com',
        activationCode: 'ABC123',
      }),
    ).toBe('LPA:1$explicit.com$EXPLICIT');
  });

  it('returns null when no data provided', () => {
    expect(buildActivationString({})).toBeNull();
  });

  it('returns null when only smdpAddress is provided', () => {
    expect(buildActivationString({ smdpAddress: 'smdp.example.com' })).toBeNull();
  });

  it('returns null when only activationCode is provided', () => {
    expect(buildActivationString({ activationCode: 'ABC123' })).toBeNull();
  });

  it('returns null when lpaString is null', () => {
    expect(buildActivationString({ lpaString: null })).toBeNull();
  });

  it('returns null when lpaString is empty string', () => {
    expect(buildActivationString({ lpaString: '' })).toBeNull();
  });
});
