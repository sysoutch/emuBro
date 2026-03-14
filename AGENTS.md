# Repository Working Notes

## Refactoring Preference

- Treat refactoring as an ongoing responsibility, not something that only happens when explicitly requested.
- When touching an area, proactively look for obvious consolidation opportunities, duplicated logic, and feature code that should live in an existing feature folder.
- If a file is getting large, split it before it becomes a maintenance problem, especially when the project already has a dedicated folder for that feature.
- Prefer small, steady structural cleanups during normal work instead of letting large runtime files accumulate unrelated responsibilities.
- Avoid creating parallel implementations when an existing module/folder can be extended cleanly.

## Project Milestones

### Current Phase

- As of 2026-03-12, the project is in `post-migration stabilization / pre-beta`.
- The app is already usable, but it is still carrying migration debt, UI parity gaps, and some legacy/runtime overlap that should be cleaned up before calling it beta.
- The current priority is not broad feature invention. The priority is making the migrated app feel complete, consistent, and reliable.

### Milestone Path

1. `Migration Recovery`
- Re-establish parity for the core Electron-era UX in the current desktop app.
- Finish missing behaviors in header, sidebar, docking, popups, support flows, theme manager, language manager, and window chrome.
- Remove obviously redundant or temporary migration paths where the new implementation already exists.

2. `Pre-Beta Hardening`
- Reduce runtime overlap between legacy bootstrap code and migrated shell/runtime modules.
- Refactor large files continuously so the codebase is easier to maintain while stabilizing behavior.
- Fix interaction bugs, resize/layout bugs, persistence bugs, and view-specific regressions.
- Ensure core user journeys work without restart hacks or manual recovery.

3. `Beta`
- Beta starts when the main desktop experience is feature-complete for normal daily use.
- Beta criteria:
- Core library browsing, emulators, support, themes, languages, tools, and settings work reliably.
- Main UI/UX parity is close enough that the legacy/classic fallback is optional, not necessary.
- Known issues are mostly edge cases, polish issues, or non-blocking regressions.
- Major migration architecture decisions are no longer in flux.

4. `Stable`
- Stable starts when the app is reliable enough to be the default recommended experience.
- Stable criteria:
- No major workflow requires the legacy fallback.
- Persistent data, downloads, launching, updates, and settings survive restart cleanly.
- Window behavior, responsiveness, and shell integration are consistent across supported setups.
- Remaining work is incremental improvement, not core recovery.

### Where We Are Going

- Move from `migration recovery` into `pre-beta hardening`, then into `beta` once the current desktop runtime is the clear primary experience.
- Keep reducing the amount of code that exists only because of historical migration steps.
- Prefer one clean implementation per feature instead of maintaining legacy and migrated behavior in parallel longer than necessary.

## Ongoing Priorities

- Maintain and improve visual parity with the historical app where that parity still matters to the user experience.
- Refactor continuously during feature work so stabilization does not create new monoliths.
- Keep theme manager, language manager, support, and library flows modular instead of routing everything through large runtime files.
- Treat restart-only fixes, resize-only fixes, and “works after manual interaction” bugs as high-priority stabilization issues.

## Future Update Tasks

- Continue shrinking legacy bootstrap/runtime responsibilities once migrated replacements are proven.
- Keep reviewing large files and move logic into feature folders early.
- Improve update readiness by keeping installer, protocol handling, persistence, and resource download flows verified after major changes.
- Use each update cycle for:
- stabilization fixes
- structural cleanup
- parity improvements
- UX polish
- only then new feature expansion

## Release Interpretation

- Do not describe the project as `beta` until the beta criteria above are broadly true in practice.
- Do not describe the project as `stable` until the stable criteria above are broadly true in practice.
- When reporting progress, state clearly:
- current milestone
- what was completed
- what still blocks the next milestone
