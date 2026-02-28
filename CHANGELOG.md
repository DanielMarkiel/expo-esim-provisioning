# expo-esim-provisioning

## 1.0.0

### Major Changes

- [`d39c0a6`](https://github.com/DanielMarkiel/expo-esim-provisioning/commit/d39c0a67ec0b2bdfc0610591405c401fcdcd921f)
  Thanks [@DanielMarkiel](https://github.com/DanielMarkiel)! - Upgrade peer dependencies to Expo SDK 55
  (`expo-modules-core` ^55.0.13, `expo-module-scripts` ^55.0.2, `react-native` 0.83.2, `react` 19.2.0).

## 0.2.0

### Minor Changes

- [`029cb04`](https://github.com/DanielMarkiel/expo-esim-provisioning/commit/029cb0492ee98c8c7ed139f2625301441d95e67a)
  Thanks [@DanielMarkiel](https://github.com/DanielMarkiel)! - Add expo-esim-provisioning module with full TypeScript
  types, Jest test setup, and CI workflow
  - Initial implementation of `isEsimSupported()`, `installEsim()`, `buildActivationString()`, `install()`,
    `scanQrCode()` and `EsimProvisioningError`
  - TypeScript type definitions for all public APIs
  - Jest configuration with initial test suite
  - GitHub Actions CI workflow with lint, build, and type-check steps
