# Active Context

## Current Work Focus
Refactoring `js/game-manager.js` into smaller modules while keeping the public API stable.

## Recent Changes
- Implemented emulator download scraping logic: when direct links are missing, the system now scrapes the configured `downloadUrl` for links matching OS-specific file patterns, allowing for robust automated downloads from complex provider pages.
- Updated emulator download UI to handle multiple discovered packages, allowing users to choose the specific version/format they want to install.
- Fixed an issue in Remote Library tool where pairing and browsing games silently failed because of the native unsupported `window.prompt` returning null; replaced it with `showTextInputDialog` from `js/ui/text-input-dialog.js`.
- Continued game-manager refactor: moved slideshow/random views and grouped/incremental rendering into `js/game-manager/views/` and `js/game-manager/rendering/` modules with dependency injection.
- Continued theme-manager refactor: moved LLM control helpers into `js/theme-manager/llm-utils.js`.
- Continued theme-manager refactor: moved gradient/intensity helpers into `js/theme-manager/editor-utils.js` and background surface helpers into `js/theme-manager/background-editor-utils.js`.
- Continued theme-manager refactor: extracted background layer editor rendering into `js/theme-manager/background-layer-editor.js`.
- Continued theme-manager refactor: moved color collection/derived CSS variable helpers into `js/theme-manager/theme-color-utils.js` and rewired imports/exports.
- Continued theme-manager refactor: extracted theme marketplace fetch logic into `js/theme-manager/marketplace-utils.js`, and moved theme upload/webhook handling into `js/theme-manager/theme-share-utils.js`.
- Continued theme-manager refactor: moved basic brand control helpers into `js/theme-manager/brand-controls-utils.js`.
- Continued theme-manager refactor: moved marketplace rendering into `js/theme-manager/marketplace-view.js`, and moved theme list UI (selector + list rendering) into `js/theme-manager/theme-library-view.js`.
- Continued theme-manager refactor: moved glass/corner appearance helpers into `js/theme-manager/theme-style-utils.js`.
- Continued theme-manager refactor: moved background application logic into `js/theme-manager/theme-background-apply.js`.
- Continued theme-manager refactor: moved editor form wiring + LLM theme apply into `js/theme-manager/theme-editor-controls.js`.
- Continued theme-manager refactor: moved background image listeners/slot handling into `js/theme-manager/theme-background-editor.js`.
- Continued theme-manager refactor: moved save/edit/delete theme actions into `js/theme-manager/theme-actions.js`.
- Continued theme-manager refactor: moved form helpers and color-picker listeners into `js/theme-manager/theme-form-utils.js`.
- Continued theme-manager refactor: moved splash theme sync into `js/theme-manager/theme-splash-utils.js` and theme toggle helpers into `js/theme-manager/theme-toggle-utils.js`.
- Extended emubro-resources configs with launcher import metadata (Steam/Epic/GOG) on Windows platform and Linux package-manager install hints for PCSX2.
- Extended emubro-resources configs across multiple platforms with Linux Flatpak/APT install hints for RetroArch cores, Dolphin, and PPSSPP.
- Continued refactors: extracted theme control helpers into `js/theme-manager/theme-controls-utils.js` and moved game launch picker UI into `js/game-manager/launch-picker.js`.
- Continued game-manager refactor: moved search/filter utilities into `js/game-manager/game-search.js`, `js/game-manager/game-filters.js`, and render helpers into `js/game-manager/render-utils.js`, wiring `js/game-manager.js` to delegate.
- Continued theme-manager refactor: extracted editor preview helpers into `js/theme-manager/theme-editor-preview.js`, editor mode toggles into `js/theme-manager/theme-editor-mode.js`, modal drag utilities into `js/theme-manager/theme-modal-utils.js`, and theme runtime logo-brand resolution into `js/theme-manager/theme-runtime-utils.js`.
- Added Linux package-manager install wiring for emulator downloads (Flatpak/APT) with user choice prompt, and extended emulator catalog payloads to include installer metadata.
- Added launcher import flow scaffolding: main-process scanner/importer for Steam/Epic (filesystem manifests), launcher URI launch handling, and library settings UI to trigger launcher scans/imports.
- Added APT sudo-friendly fallback (open terminal if needed), GOG Galaxy sqlite scanning + Heroic cache scanning, and launcher import modal dedupe/badges for already-imported games.
- Added launcher URI fallback execution (open launcher executable when scheme fails), installed-only filtering in launcher import UI, per-launcher tags on import, and preload allowlist entries for launcher scan/import IPC.
- Adjusted header drag region sizing and search container flex so the space between search and theme controls is draggable (header spacing tweaks in `scss/_header.scss`).
- Extracted game/filters/launch-candidate helpers from `js/game-manager.js` into `js/game-manager/game-utils.js`, `js/game-manager/filters-utils.js`, and `js/game-manager/launch-candidate-utils.js`, and rewired imports.
- Began `js/game-manager.js` refactor by extracting runtime data rule normalization into `js/game-manager/runtime-data-utils.js` and wiring the import.
- Fixed the long-running renderer RAM growth that occurred when switching themes in Library/Cover view:
  - Identified as native renderer/compositor pressure (not a JS heap leak); JS heap stayed stable while renderer RSS/private memory grew
  - Reduced cover virtualization residency in `js/game-manager.js` (smaller cover batch and fewer resident chunks)
  - Updated lazy image observation in `js/game-manager/lazy-game-images.js` to use `.game-scroll-body` as observer root and recreate observers when root changes
  - Removed high-cost cover compositing/blur/shimmer effects in `scss/games/_core-cover.scss` that caused excessive native memory pressure
  - Verified behavior now: memory may spike during decode/warmup but no longer grows infinitely after theme switches
- Fixed category selection UX:
  - Ctrl/Cmd multi-select in single mode now works logically and visually in categories list
  - Category mode label now correctly renders template placeholders (no raw `{{mode}}`)
- Improved library section behavior:
  - Replaced `Installed` games section with `Favorite` games (games with `rating > 0`)
  - Added backward compatibility mapping so stored `installed` default section resolves to `favorite`
- Improved game view consistency:
  - Unified title-row height semantics across Cover/List/Table with Slideshow/Random rhythm
- Theme and branding updates:
  - Decoupled logo span/circle coloring from global `--brand-color` into `--logo-brand-color`
  - Prevented "Change Logo Span Color?" from affecting sidebar/global brand styling
  - Added/extended logo text effect behavior and icon-apply flow for default themes
- Community/theme manager polish:
  - Added Font Awesome brand icons for community social cards
  - Fixed broken delete icon in Theme Manager custom theme actions and aligned action icon sizing
- Rendering/performance fixes:
  - Restored grouped rendering behavior and improved grouped lazy loading
  - Improved cover-view incremental loading behavior and related scroll/load edge cases
- Support view enhancement:
  - Added markdown rendering for "Suggested Fix Steps" content in support view
- LLM theme generation improvements:
  - Added prompt controls (mood/style) and improved variation/randomization
  - Improved color propagation/update consistency and reduced repetitive blue-biased outcomes
- Moved runtime backup rule editing from global Settings into Emulator Edit modal (`js/game-manager/emulator-config-actions.js`) via a new "Runtime Backup" tab
- Added emulator-specific runtime backup rules (`runtimeDataRules`) to emulator local config and wired them into game launch payload creation
- Updated launch pipeline (`js/game-manager/missing-game-recovery.js`, `js/game-manager.js`, `main/ipc/games.js`, `main/game-session-manager.js`) to accept per-launch runtime backup rules
- Added in-app game session overlay controls (`js/game-session-overlay.js`, `renderer.js`) with actions for Show emuBro, Alt+Enter, screenshot, and quit game process
- Added BIOS Manager tool view (`js/tools-manager.js`, `index.html`, locale updates) to list BIOS folders/files per platform, add BIOS files, and open folders
- Updated launch flow to persist `lastPlayed` directly in main process on successful launch for better Recently Played consistency
- Implemented translation fallback to English in `js/i18n-manager.js` by overriding `i18n.t` to search in `allTranslations['en']` when a key is missing in the current language
- Implemented logic for theme toggle button to temporally invert current theme colors (Light -> Dark, Dark -> Light) instead of switching presets
- Improved `applyCustomTheme` to support granular color overrides (Header, Sidebar, Actionbar)
- Enhanced `getCurrentThemeColors` to capture comprehensive color state for inversion
- Implemented automatic webhook re-configuration when theme upload fails (e.g., if webhook is deleted on Discord)
- Fixed Language Manager UI layout issues where long text caused rows to look weird
- Improved Language Manager editor styling (grid layout, spacing, and font sizes)
- Fixed GitHub Release workflow:
  - Added `permissions: contents: write` to the release job to allow artifact upload and release creation
  - Added `npm run sync:resources` step to CI build to ensure `emubro-resources` are present during packaging
  - Explicitly linked `electron-builder.config.js` in packaging commands
  - Fixed Linux build error by switching to PNG icon (`icon.png`) as ICO is not supported by `app-builder` on Linux
  - Resolved GitHub API race conditions (404 Not Found on asset delete/overwrite) by switching to `--publish onTag` and performing clean tag resets
  - Ensured release visibility by explicitly setting `releaseType: "release"` in `electron-builder.config.js`
  - Added explicit artifact upload step for CI debugging and fallback access
  - Modernized `sass-loader` configuration in `webpack.config.js` to address missing CSS in production builds
- Committed documentation and core feature enhancements to git
- Updated `index.html` title to use localized `app.title` via i18n
- Implemented Language Manager with progress tracking, editing, and creation capabilities
- Added flag icons to language selector using `flag-icons` library
- Replaced standard select dropdown with custom styled dropdown for languages
- Rewrote `README.md` to reflect the transition from Java to Electron/Node.js, removing outdated requirements and adding build instructions
- Applied glass effect styling to List, Table, Slideshow, and Random views in `scss/_glass-effect.scss`
- Fixed Table view styling and added image sizing constraints
- Implemented missing CSS for Slideshow view (carousel layout, transitions, controls)
- Implemented missing CSS for Random view (display card, shuffle animation)
- Updated `scss/_views.scss` to fix responsive selectors for list items
- Created memory-bank directory structure
- Initialized projectbrief.md with core project overview
- Initialized productContext.md with problem-solving context
- Beginning implementation of core system patterns
- Implemented draggable functionality for the theme-manager floating window
- Added docking functionality for the theme-manager (pin to right)
- Implemented layout adjustment when docked (main content resizes)
- Added auto-centering logic for theme-manager when window is resized and modal is off-screen
- Refined theme-manager resize behavior: slower/smoother reset and only when window shrinks
- Implemented user-configurable Discord webhook for theme uploads (removed hardcoded URL)
- Fixed and optimized window docking and persistence logic
- Standardized layout shift behavior using a single `panel-docked` body class
- Implemented explicit "re-docking" logic for reopening previously pinned windows
- Refactored `GamepadManager` to use `gamepad.js` library for robust event handling and state management
- Updated `GamepadTool` to utilize the new event-driven gamepad architecture
- Fixed `TypeError` in `GamepadManager` where `getConnectedGamepads` could crash if a gamepad event was undefined
- Improved `GamepadManager` event handling to support both standard `GamepadEvent` and direct gamepad object payloads
- Implemented robust `syncWithNativeAPI` polling fallback in `GamepadManager` to detect controllers that don't emit events (e.g. stale state or browser quirks) and ensure button states are always fresh
- Applied advanced CSS styling to `GamepadTool` and `MonitorTool` in `scss/_tools.scss`, utilizing glass effect mixins, responsive grid layouts, and theme variables for a polished look

## Next Steps
1. Push changes to remote repository (if requested)
2. Verify all views are rendering correctly in the application
2. Complete systemPatterns.md with architectural decisions
3. Create techContext.md with technology stack details
4. Implement progress.md to track development status
5. Begin implementing core features based on documented patterns
6. Update documentation as features are implemented
7. Add a future "Suggested Games" view powered by AI recommendations with pluggable providers (ChatGPT, Gemini, Ollama)
8. Refactor `js/game-manager.js` into modular files under `js/game-manager/` to reduce file size and improve maintainability
9. Proposed module split for `js/game-manager/`:
   - `state.js` (shared state, getters/setters)
   - `views/` (`cover-view.js`, `list-view.js`, `table-view.js`, `slideshow-view.js`, `random-view.js`, `emulators-view.js`)
   - `popups/` (`game-info-popup.js`, `emulator-info-popup.js`, `dialogs.js`)
   - `actions/` (`game-actions.js`, `emulator-actions.js`, `download-actions.js`)
   - `rendering/` (`lazy-images.js`, `incremental-render.js`, `filters-sort.js`)
   - `index.js` as the compatibility entry exporting current public API
10. Keep exports stable during refactor so `renderer.js` and other consumers do not break
11. Refactor `main.js` into modular files under `main/` (window lifecycle, IPC handlers, library/db, launcher, download/install, locale manager) to reduce coupling and improve startup reliability
12. Future TODO Bank (requested by user):
   - Auto memory card / save-state backups to AppData
   - Auto in-game screenshotter to build multi-image cover sets per game
   - In-app game overlay controls (Alt+Enter, screenshot, show emuBro, quit game, etc.)
   - BIOS management workflow (detect missing BIOS, import/open BIOS folders)
   - Better controller-first UI navigation (Steam Deck / Lenovo Legion Go friendly)
   - Emulator update flow that preserves save states and memory cards

## Active Decisions and Considerations
- Using CSS Grid for the main `games-container` but `flex-column` or `block` overrides (via `grid-column: 1 / -1`) for non-grid views like List, Table, and Slideshow
- Extending Glass Effect (backdrop-filter) to all view containers for consistency when enabled
- Using Electron for cross-platform compatibility
- Implementing Steam-like interface design
- Supporting multiple themes through localStorage
- Multi-language support through i18n system
- Modular architecture with separate managers for different functionalities
- `js/game-manager.js` has grown too large; ongoing work should prioritize modularization into `js/game-manager/` with stable interfaces
- `main.js` is also too large and should be split into domain modules with a small composition entrypoint

## Important Patterns and Preferences
- Component-based architecture
- IPC communication between main and renderer processes
- Theme management through localStorage
- Internationalization using i18n.js
- Responsive design for different screen sizes
- Keep household continuously: prefer ongoing cleanup/refactoring, reduce oversized files, remove duplication, and keep modules tidy as part of regular feature work

## Learnings and Project Insights
- When dynamically generating HTML classes in JS (e.g. `list-item-image`), ensure strict synchronization with SCSS selectors
- `scss/_games.scss` serves as the central stylesheet for all game visualization modes, not just the default grid
- The project requires careful consideration of Electron's main vs renderer process architecture
- Theme customization needs to be well-structured for both custom and community themes
- Internationalization should be implemented early to support multi-language features
- Game library management will be a core feature requiring robust data handling
