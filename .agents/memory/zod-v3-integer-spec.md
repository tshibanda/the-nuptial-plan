---
name: Zod v3 integer spec
description: OpenAPI type:integer causes Orval to emit zod.int() which doesn't exist in Zod v3.
---

Orval 8.x generates `zod.int()` for OpenAPI `type: integer` fields. `zod.int()` is a **Zod v4 API** and does not exist in Zod v3 (the workspace uses `zod: ^3.x`). This causes a typecheck failure after codegen:

```
error TS2339: Property 'int' does not exist on type 'typeof import(".../zod/index")'
```

**Why:** The workspace catalog pins `zod: ^3.25.76`. Orval 8.23 targets Zod v4 for integer output.

**How to apply:** In `lib/api-spec/openapi.yaml`, use `type: number` for all integer fields (IDs, counts, etc.) — never `type: integer`. For nullable integers use `type: ["number", "null"]`. This generates `zod.number()` which is valid in both Zod v3 and v4.
