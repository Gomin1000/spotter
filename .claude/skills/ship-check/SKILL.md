---
name: ship-check
description: Pre-push check. Runs lint, typecheck, build, a secrets scan and a README-vs-package.json check, then reports PASS/FAIL for each. Only run when the user types /ship-check.
disable-model-invocation: true
---

# /ship-check

Run every check below from the repo root, even if an earlier one fails. **Do not fix anything** — report only. Fix something only if the user asks afterwards.

## 1. Lint and types
- `npm run lint`
- `npx tsc --noEmit`

PASS if both exit 0. On FAIL, quote the first few errors (file:line).

## 2. Build
- `npm run build`

PASS if it exits 0. On FAIL, quote the first error.

## 3. Secrets
- `.env.local` must not be tracked: `git ls-files --error-unmatch .env.local` must fail. Also flag any tracked `.env*` file other than `.env.example`: `git ls-files | grep -E '(^|/)\.env'`.
- No keys in tracked files: `git grep -nIE '<pattern>'` over tracked files, excluding `package-lock.json`, with patterns such as:
  - `AIza[0-9A-Za-z_-]{35}` (Google / Gemini)
  - `sk-[A-Za-z0-9_-]{20,}` (OpenAI / Anthropic style)
  - `gh[pousr]_[A-Za-z0-9]{36}` (GitHub tokens)
  - `AKIA[0-9A-Z]{16}` (AWS)
  - `-----BEGIN [A-Z ]*PRIVATE KEY-----`
  - `(api[_-]?key|secret|token|password)\s*[:=]\s*["'][^"'\s]{12,}["']` (case-insensitive)
- Read each hit. Reading a key from `process.env.X` is fine; a literal value is not.

PASS if `.env.local` is untracked and no literal secret is found. On FAIL, list file:line (never print the secret value itself — mask all but the first 4 characters).

## 4. README run steps
- Read `package.json` `scripts` and the README's run/setup instructions.
- PASS if every `npm run <x>` / `npm <x>` command the README tells people to run exists in `scripts`, and the README actually says how to install and run the app (`npm install` plus `npm run dev` or equivalent).
- FAIL if the README references a script that doesn't exist, or has no install/run steps for the app. Say what's missing.

## Report

Reply with only this short list (one line of detail per FAIL), then stop:

```
/ship-check
1. Lint + tsc   PASS|FAIL  <detail>
2. Build        PASS|FAIL  <detail>
3. Secrets      PASS|FAIL  <detail>
4. README       PASS|FAIL  <detail>
Overall: PASS|FAIL
```
