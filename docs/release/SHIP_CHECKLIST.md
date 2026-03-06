# Ship Checklist

Use this before every public release.  
`PASS` means release can continue. `FAIL` means block release.

## 1. Release Identity
- [ ] Version bumped in all required files (`package.json`, `desktop/package.json`, `desktop/src-tauri/tauri.conf.json`)
- [ ] Release commit created on target branch
- [ ] Annotated tag created (`vX.Y.Z...`) and pushed
- [ ] Release notes drafted

## 2. Build Gate
- [ ] `npm run build:web` passes
- [ ] Platform bundle build passes for each shipping target:
  - [ ] Windows (`npm run build` or `npm run build:win:portable`)
  - [ ] Linux AppImage (`npm run build:linux:appimage`)
  - [ ] Linux Flatpak if shipping it (`npm run build:linux:flatpak`)
  - [ ] macOS if shipping it (`npm run build:mac`)
- [ ] No new build errors or regressions compared to previous release

## 3. Test Gate
- [ ] Automated test suite exists and passes
- [ ] Smoke test completed on each shipped platform:
  - [ ] App starts and renders main window
  - [ ] Library loads and scrolls without obvious stutter/crash
  - [ ] Game launch path works at least once
  - [ ] Settings save/reload works
  - [ ] Update check UI works

## 4. Security Gate
- [ ] `npm audit --omit=dev --audit-level=high` passes (root)
- [ ] `npm --prefix desktop audit --omit=dev --audit-level=high` passes
- [ ] No known critical/high vulnerabilities in shipped runtime dependencies
- [ ] Sensitive defaults reviewed (API keys, debug flags, unsafe endpoints)

## 5. Operations Gate
- [ ] Crash/error reporting strategy confirmed (or explicitly accepted as missing)
- [ ] Rollback plan documented (previous known-good tag/build)
- [ ] Checksums/signatures published for artifacts
- [ ] Upgrade path validated from last release

## 6. Go/No-Go Rule
- Release is **GO** only if sections 1-4 are all PASS and any section-5 gaps are explicitly accepted by maintainer.

## Suggested Commands
```bash
npm run build:web
npm audit --omit=dev --audit-level=high
npm --prefix desktop audit --omit=dev --audit-level=high
git status --short
git rev-parse --short HEAD
git tag --points-at HEAD
```

