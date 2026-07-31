---
name: Jardin Parisien design system
description: Full brand palette swap (navy→plum, gold→same, ivory→cream, +sage, +rose) applied to web and mobile apps.
---

## Palette "Jardin Parisien"

| Role | HSL (web CSS var) | Hex (mobile) | Notes |
|---|---|---|---|
| Background | `33 28% 96%` | `#F8F3EE` | Crème chaude |
| Foreground | `300 42% 9%` | `#1A091A` | Prune-noir |
| Primary | `300 34% 27%` | `#5D2D5D` | Prune profond |
| Secondary | `120 18% 48%` | `#649064` | Sauge |
| Accent | `353 38% 67%` | `#CC8C94` | Rose poudrée |
| Gold | `40 43% 60%` | `#C8A96E` | Or chaud (inchangé) |
| Sidebar | `300 38% 16%` | `#3C1A3C` | Prune très sombre |
| Card | `310 38% 98%` | `#FDF9FD` | Blanc rosé |
| Border | `300 12% 84%` | `#D7CDD7` | Lilas discret |
| Ring | `40 43% 60%` | — | Or (active border) |

## Where it lives

- **Web tokens**: `artifacts/nuptial-plan/src/index.css` — `:root` and `.dark` blocks; @theme inline maps to Tailwind classes.
- **Web shell**: `artifacts/nuptial-plan/src/components/layout/app-shell.tsx` — all hardcoded hex replaced with Tailwind semantic classes (bg-primary, bg-sidebar-accent, text-muted-foreground, etc.)
- **Mobile palette**: `artifacts/mobile/constants/colors.ts` — complete `colors.light` and `colors.dark` objects. Legacy aliases `navy`/`navyDark`/`navyLight` kept pointing to plum values so existing screens using `colors.navy*` work unchanged.
- **Mobile auth**: `artifacts/mobile/app/(auth)/sign-in.tsx` and `sign-up.tsx` — NAVY_DARK/NAVY/GOLD/IVORY/MUTED constants updated.

## Key decisions

**Why:** Élise asked for a "Jardin Parisien" aesthetic — away from cold navy towards warmer plum/sage/rose.
**How to apply:** Any new UI should use plum as primary action color, dusty rose as accent/hover highlight, sage for success states, and gold for premium/celebration moments. The sidebar background is always the dark plum (`#3C1A3C` / `hsl(300 38% 16%)`).

## Legacy nav compatibility

`colors.navy`, `colors.navyDark`, `colors.navyLight` are kept as aliases in `colors.ts` so existing `colors.navy` references in tab screens continue to work — they now render in plum.
