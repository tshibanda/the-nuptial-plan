---
name: Expo static publication builds
description: Why the Expo Go static deployment bundles are generated without Metro minification.
---

Generate the iOS and Android static Expo Go bundles without Metro minification, and keep asset extraction compatible with the readable bundle format.

**Why:** Sequential minified bundles exceeded the multi-artifact publication build window and were terminated during Android bundling. Unminified production-mode bundles completed comfortably within the window; asset URL rewriting still needs to copy fonts and images.

Run cold publication-build validation without the Expo development workflow active. Two Metro instances can exhaust the workspace's file-watcher allowance, causing `ENOSPC` and a misleading HTTP 500 while downloading a bundle.

Manually constructed Expo Router bundle URLs must include `transform.routerRoot=app`; otherwise a clean publication cache can fail to transform `_ctx.*.js` even when a warmed local cache succeeds.

**How to apply:** When changing the mobile static build pipeline, stop the Expo development workflow before local validation, preserve the router-root query parameter, validate a cold dual-platform build, confirm it reports nonzero copied assets, and do not re-enable minification without verifying the complete publish build stays within its time limit.