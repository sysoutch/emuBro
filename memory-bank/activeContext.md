# Active Context

## Current Work Focus
The current focus is on updating project documentation and maintaining the codebase to align with the new Electron-based architecture.

## Recent Changes
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
