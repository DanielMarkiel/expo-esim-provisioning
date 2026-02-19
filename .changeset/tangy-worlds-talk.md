---
'expo-esim-provisioning': minor
---

Add expo-esim-provisioning module with full TypeScript types, Jest test setup, and CI workflow

- Initial implementation of `isEsimSupported()`, `installEsim()`, `buildActivationString()`, `install()`, `scanQrCode()`
  and `EsimProvisioningError`
- TypeScript type definitions for all public APIs
- Jest configuration with initial test suite
- GitHub Actions CI workflow with lint, build, and type-check steps
