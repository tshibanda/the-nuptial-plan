---
name: Hooks in map
description: Calling hooks inside .map() violates Rules of Hooks; extract to a named component.
---

Calling `useRoute`, `useState`, or any React hook inside a `.map()` callback inside JSX causes:

```
Rendered more hooks than during the previous render.
```

**Why:** React's Rules of Hooks require hooks to be called unconditionally at the top level of a component or custom hook. A `.map()` callback is neither.

**How to apply:** Extract the per-item logic into a named component:

```tsx
// WRONG — hook in map
weddings.map(w => {
  const [isActive] = useRoute(`/mariages/${w.id}`); // ❌
  return <Link className={isActive ? "active" : ""} .../>
})

// CORRECT — extract to component
function WeddingLink({ wedding }) {
  const [isActive] = useRoute(`/mariages/${wedding.id}`); // ✅
  return <Link className={isActive ? "active" : ""} .../>
}
// then: weddings.map(w => <WeddingLink key={w.id} wedding={w} />)
```
