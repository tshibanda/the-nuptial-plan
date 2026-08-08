---
name: Expo Launch iOS CocoaPods
description: Durable diagnostic for App Store builds failing during React Native SPM setup.
---

When Expo Launch fails in `react_native/scripts/cocoapods/spm.rb` with `undefined method package_product_dependencies for nil:NilClass` while adding ClerkKit, first update `@clerk/expo` to the latest stable release compatible with the current Expo SDK. If the same failure remains, exclude `@clerk/expo` from Expo autolinking when the app only uses Clerk's JavaScript provider/hooks and does not use Clerk native views.

**Why:** An older Clerk Expo release can generate SPM metadata that React Native 0.81 cannot resolve during CocoaPods post-install, even though Metro and TypeScript work normally.

**How to apply:** Use Expo Launch logs to identify the first CocoaPods error, keep `app.json` static, update the direct Clerk Expo dependency in the mobile workspace, add the targeted autolinking exclusion if needed, restart Expo, and verify an iOS export before asking the user to retry Publish.