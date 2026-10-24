---
name: Expo React Compiler compatibility
description: Runtime compatibility issue observed with the experimental Expo React Compiler.
---

Keep `experiments.reactCompiler` disabled in the mobile Expo app unless the current compiler/runtime combination is verified on both native and web routes. With the compiler enabled, the web preview threw an invalid-hook error involving `useMemoCache`; disabling it removed that runtime error.

**Why:** TypeScript and Metro bundling alone did not catch the preview-time hook failure.

**How to apply:** After Expo or React upgrades, explicitly smoke-test public auth routes and a signed-in tab before considering re-enabling the compiler.
