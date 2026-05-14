# Refactor — plan index

Six independently-shippable phases derived from `docs/superpowers/specs/2026-05-14-codebase-refactor-strategy.md`. Each phase is its own plan file. Recommended order is 1 → 5; Phase 6 is opportunistic.

| # | Plan | Effort | Risk | When |
|---|---|---|---|---|
| 1 | [Legacy purge](./2026-05-14-refactor-phase-1-legacy-purge.md) | ~30 min | Low — pure deletion | Anytime |
| 2 | [Helper consolidation](./2026-05-14-refactor-phase-2-helper-consolidation.md) | ~45 min | Low — behavior preserved | After Phase 1 |
| 3 | [Quality gates](./2026-05-14-refactor-phase-3-quality-gates.md) | ~1 hr | Low | **Highest dollar-value if only one is done** — anytime |
| 4 | [Data hardening (zod + error.tsx)](./2026-05-14-refactor-phase-4-data-hardening.md) | ~1 hr | Low — schema permissive on first pass | After Phases 1-3 |
| 5 | [CSS + a11y](./2026-05-14-refactor-phase-5-css-a11y.md) | ~1 hr | Low — visually verify each token swap | After Phases 1, 3 |
| 6 | [Bigger refactors (optional)](./2026-05-14-refactor-phase-6-bigger-refactors.md) | TBD | Medium — touches view internals | When you next touch each area |

**Total:** ~4-5 hr for Phases 1-5 in one focused session, or one PR per evening over a week.

## Suggested sequencing

**Single-session sprint (one push):**
1 → 2 → 3 → 4 → 5, ~4-5 hours. CI from Phase 3 protects later phases.

**Spread out (one phase per PR):**
Same order, but commit between phases. Each PR is self-contained and reviewable.

**Minimum viable refactor (if you only have an hour):**
Phase 3 alone. It's the only phase that prevents *future* regressions; the others are one-time cleanups.

## Cross-references

Each plan file references the strategy doc and lists its own dependencies on previous phases. Plans are written for either `superpowers:subagent-driven-development` (one fresh subagent per task, recommended) or `superpowers:executing-plans` (inline batch execution).
