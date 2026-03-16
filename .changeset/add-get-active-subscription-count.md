---
"expo-esim-provisioning": minor
---

Add `getActiveSubscriptionCount()` and iOS native module

New `getActiveSubscriptionCount()` function returns the number of active cellular subscriptions on iOS (physical SIM + eSIM) using `CTTelephonyNetworkInfo`. This enables detecting whether an eSIM was installed after returning from the Apple Universal Link setup flow — snapshot the count before and after to avoid blind backend polling when the user cancels.

- Added `ios/ExpoEsimProvisioningModule.swift` — first native iOS module for the package
- Updated `expo-module.config.json` to register the iOS platform
- Returns `-1` on Android (not needed — `EuiccManager` intent already provides a definitive result)
