---
"expo-esim-provisioning": minor
---

Add `getActiveSubscriptionCount()` and iOS native module

New `getActiveSubscriptionCount()` function returns the number of active cellular subscriptions on iOS using `CTTelephonyNetworkInfo`. Use as a hint after the Apple Universal Link eSIM setup flow: if count increased, poll backend with full timeout (high confidence); if unchanged, poll with a shorter timeout (ambiguous — could be cancel or newly installed but not yet active eSIM).

- Added `ios/ExpoEsimProvisioningModule.swift` — first native iOS module for the package
- Added `ios/ExpoEsimProvisioning.podspec` for CocoaPods / Expo autolinking
- Updated `expo-module.config.json` to register the iOS platform
- Returns `-1` on Android (not needed — `EuiccManager` intent already provides a definitive result)
