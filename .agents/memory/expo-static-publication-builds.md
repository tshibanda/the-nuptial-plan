---
name: Expo static publication builds
description: Why the Expo Go static deployment bundles are generated without Metro minification.
---

Generate the iOS and Android static Expo Go bundles without Metro minification, and keep asset extraction compatible with the readable bundle format.

**Why:** Sequential minified bundles exceeded the multi-artifact publication build window and were terminated during Android bundling. Unminified production-mode bundles completed comfortably within the window; asset URL rewriting still needs to copy fonts and images.

Run cold publication-build validation without the Expo development workflow active. Two Metro instances can exhaust the workspace's file-watcher allowance, causing `ENOSPC` and a misleading HTTP 500 while downloading a bundle.

Manually constructed Expo Router bundle URLs must include `transform.routerRoot=app`. The Babel config must also inline Expo Router's relative and absolute app roots plus the native production import mode (`sync`), because a clean publication may not propagate the custom transform caller; `/tmp` Metro caches can hide this locally.

**How to apply:** When changing the mobile static build pipeline, stop the Expo development workflow, clear project and `/tmp` Metro caches, preserve the router-root query and all Babel router-environment inlining, validate both platforms and nonzero assets, and keep minification off unless the full build fits its limit.