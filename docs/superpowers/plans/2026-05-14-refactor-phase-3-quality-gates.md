# Refactor Phase 3 — Quality gates

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.
> Strategy doc: `docs/superpowers/specs/2026-05-14-codebase-refactor-strategy.md`
> Independent of Phases 1, 2 (can run any time) — but easier *after* dead code is gone (less to lint).

**Goal:** Establish the basic quality bar that prevents broken code from shipping. Today: no ESLint config (so `next lint` runs base rules only), no CI, `npm run build` does not run `tsc`, no pre-commit hook. After this phase: type errors block builds, ESLint catches `react-hooks/exhaustive-deps` and friends, every push runs the full check, every commit is gated locally.

**Architecture:** Three layers of defense.
1. **Local pre-commit** — fast feedback before commit lands
2. **CI on push/PR** — same checks, can't be bypassed
3. **Build gate** — typecheck happens during `next build` so Vercel deploys fail on type errors

**Tech Stack:** Adds `eslint`, `@typescript-eslint/*`, `eslint-config-next`, `prettier`, `simple-git-hooks`.

---

## File structure

| Action | Path |
|---|---|
| Create | `eslint.config.js` (flat config) |
| Create | `.prettierrc` |
| Create | `.prettierignore` |
| Create | `.github/workflows/ci.yml` |
| Modify | `package.json` (build, lint, format scripts; pre-commit hook block; new devDependencies) |
| Modify | `tsconfig.json` (`noUncheckedIndexedAccess: true`) |
| Modify | source files where strictness surfaces issues (small fixes, in place) |

---

## Task 1 — ESLint flat config

**Files:** `eslint.config.js`, `package.json`

- [ ] **Step 1: Install dev deps**

```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-config-next eslint-plugin-react-hooks
```

- [ ] **Step 2: Create `eslint.config.js`** (Next 16 supports flat config natively)

```js
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "_legacy/**",
      "scripts/python/**",
      "next-env.d.ts",
    ],
  },
  {
    files: ["**/*.{ts,tsx,js,mjs}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "@next/next": nextPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Soften noisy ones — bring back later if needed:
      "@next/next/no-img-element": "off",
    },
  },
];
```

`@next/next/no-img-element` is set to `off` because Phase 6 handles the `<img>` → `<Image>` migration. Until then, the inline disables can be deleted in a follow-up step.

- [ ] **Step 3: Update `lint` script in `package.json`**

```json
"lint": "eslint ."
```

- [ ] **Step 4: First run — assess noise**

```bash
npm run lint 2>&1 | tail -50
```

If hundreds of errors surface (likely on first run): triage. For each rule firing >10 times, decide:
- Easy mechanical fix → fix in this task
- Legitimate concern but big diff → downgrade to `warn` for now, ticket for later
- Style-only / not applicable → set to `off`

Goal: `npm run lint` exits 0 (warnings allowed; no errors).

- [ ] **Step 5: Remove inline `// eslint-disable-next-line @next/next/no-img-element` comments**

Now that the rule is off in config:

```bash
grep -rn "eslint-disable-next-line @next/next/no-img-element" components app --include="*.tsx"
```

For each match, delete that comment line.

- [ ] **Step 6: Verify clean**

```bash
npm run lint && npx tsc --noEmit && npm test
```

- [ ] **Step 7: Commit**

```bash
git add eslint.config.js package.json package-lock.json components/ app/
git commit -m "$(cat <<'EOF'
Quality: ESLint flat config (next + ts + react-hooks)

next/core-web-vitals + @typescript-eslint/recommended-style +
react-hooks/recommended via flat config. @next/next/no-img-element
off (Phase 6 handles Image migration); removes the 6 inline
eslint-disable comments that were silencing it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — Typecheck-in-build + `noUncheckedIndexedAccess`

**Files:** `package.json`, `tsconfig.json`, source files

- [ ] **Step 1: Update `build` script**

In `package.json`:

```json
"build": "tsc --noEmit && next build"
```

- [ ] **Step 2: Add `noUncheckedIndexedAccess` to `tsconfig.json`**

In `compilerOptions`, add:

```json
"noUncheckedIndexedAccess": true
```

- [ ] **Step 3: First check — see what breaks**

```bash
npx tsc --noEmit 2>&1 | tail -40
```

`noUncheckedIndexedAccess` flips many `T[]` accesses to return `T | undefined`. Common failures:
- `discography[0].title` → must guard or assert
- `moods[0]` → must guard
- `Map.get(k).count` → must guard
- Loop iterations and `.map(arr => arr[0])` patterns

For each error: prefer adding a guard (`if (!album) return null;`) or using `??` fallback. Avoid `!` non-null assertion unless the invariant is genuinely guaranteed by surrounding code (and add a comment in that case).

If too many surface and you want to defer, set `noUncheckedIndexedAccess: false` for now and ticket the work.

- [ ] **Step 4: Verify**

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json
# plus any source files touched in Step 3
git commit -m "$(cat <<'EOF'
Quality: tsc gates next build + noUncheckedIndexedAccess

build script now runs tsc --noEmit before next build, so type errors
fail Vercel deploys instead of slipping through SWC.

noUncheckedIndexedAccess catches the silent foot-gun where indexing
returns T instead of T | undefined. Adds the guards needed at the
sites it surfaced.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Prettier

**Files:** `.prettierrc`, `.prettierignore`, `package.json`

- [ ] **Step 1: Install**

```bash
npm install --save-dev prettier
```

- [ ] **Step 2: Create `.prettierrc`**

```json
{
  "printWidth": 100,
  "trailingComma": "all",
  "singleQuote": false,
  "semi": true,
  "arrowParens": "always"
}
```

(These match the existing house style — verify by sampling a few files. Adjust if obviously wrong.)

- [ ] **Step 3: Create `.prettierignore`**

```
.next
node_modules
_legacy
scripts/python
*.md
package-lock.json
```

- [ ] **Step 4: Add scripts to `package.json`**

```json
"format": "prettier --write .",
"format:check": "prettier --check ."
```

- [ ] **Step 5: First format pass**

```bash
npm run format
```

This will produce a large diff — that's fine and expected as a one-time normalization. Do not mix this with logic changes.

- [ ] **Step 6: Verify nothing else broke**

```bash
npm run lint && npx tsc --noEmit && npm test
```

- [ ] **Step 7: Commit (one-time format pass — keep separate from logic)**

```bash
git add .prettierrc .prettierignore package.json package-lock.json
git commit -m "Quality: add Prettier config + scripts

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"

git add -A
git commit -m "Style: prettier --write . (one-time normalization)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — Pre-commit hook (simple-git-hooks)

**Files:** `package.json`

- [ ] **Step 1: Install + configure**

```bash
npm install --save-dev simple-git-hooks
```

Add to `package.json`:

```json
"simple-git-hooks": {
  "pre-commit": "npm run lint && npx tsc --noEmit && npm test"
}
```

- [ ] **Step 2: Activate the hook**

```bash
npx simple-git-hooks
```

This installs the script into `.git/hooks/pre-commit`. (Automatic for fresh clones if you add a `postinstall` script — see optional Step 4.)

- [ ] **Step 3: Test it**

Make a deliberate type error somewhere obvious (e.g., add `const x: number = "string";` to a file). Try `git commit` — it should be blocked.

Revert the change.

- [ ] **Step 4 (optional): Auto-install on `npm install`**

Add to `package.json` scripts:

```json
"postinstall": "simple-git-hooks"
```

So fresh clones get the hook automatically. If you don't want this, skip — but document the manual `npx simple-git-hooks` step in README.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "$(cat <<'EOF'
Quality: pre-commit hook (lint + typecheck + test)

simple-git-hooks pre-commit runs npm run lint, tsc --noEmit, npm test
before every commit. simple-git-hooks chosen over husky for the
lighter footprint (~5 LOC config in package.json, no .husky/ folder).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — GitHub Actions CI

**Files:** `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test
      - run: npm run build
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          MONGODB_DB: ${{ secrets.MONGODB_DB }}
```

`MONGODB_URI` / `MONGODB_DB` go in the repo's GitHub Actions secrets. If Phase 4's lazy-init refactor is already done, the build doesn't need them; until then, it does.

- [ ] **Step 2: Push and watch the run**

```bash
git add .github/workflows/ci.yml
git commit -m "$(cat <<'EOF'
Quality: GitHub Actions CI (lint + typecheck + test + build)

Runs on every push to main and every PR. Closes the gap where Vercel
auto-deploys main with no quality gate.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin main
```

Open the GitHub repo → Actions tab. Confirm the workflow runs and goes green. If `npm run build` fails because secrets aren't set, add them in Settings → Secrets → Actions.

---

## Task 6 — Push + verify

- [ ] **Step 1: Final local check**

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build 2>&1 | tail -5
```

- [ ] **Step 2: Push**

```bash
git push origin main 2>&1 | tail -3
```

Watch CI — it should be green.

---

## Acceptance

- `eslint.config.js` exists; `npm run lint` exits 0
- `tsconfig.json` has `noUncheckedIndexedAccess: true`
- `npm run build` runs `tsc --noEmit` before `next build`
- `.prettierrc` / `.prettierignore` exist; `npm run format` works
- `simple-git-hooks` pre-commit runs lint + typecheck + tests; deliberate type errors are blocked
- `.github/workflows/ci.yml` exists; pushes to `main` and PRs run the full check; first run is green
- All 6 inline `eslint-disable-next-line @next/next/no-img-element` comments removed
