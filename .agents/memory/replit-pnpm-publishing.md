---
name: Replit pnpm publishing
description: Constraints that keep package installation and React type resolution stable during Replit publishing.
---

Do not pin a different pnpm release through the root package-manager declaration when Replit already provides pnpm, and keep the default isolated node linker in this mixed Expo/web workspace. Keep shared web React types on the same React 19.1 generation required by Expo.

**Why:** Replit's publish installer attempted to bootstrap the pinned pnpm release and aborted when it could not create another thread. Hoisted dependency layout also mixed Expo's React 19.1 types with newer web React types, producing unrelated-ref type failures.

**How to apply:** When changing package tooling or React types, use the Replit-provided pnpm, preserve isolated linking, align shared React type generations with Expo, and verify a clean install plus every artifact's production build.