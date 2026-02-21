# Progress

## What Works
- Automatic webhook re-configuration on upload failure
- Localized App Title
- Git commit of all current progress and documentation
- Language Manager (Edit, Create, Progress Tracking)
- Custom Language Dropdown with Flag Icons
- Language Manager UI layout fix for long text content
- Hardcoded Webhook URL base in validation to avoid translation issues
- Implemented translation fallback to English for missing keys in other locales
- Project structure with memory-bank documentation system
- README.md updated for Electron version
- Core documentation files initialized (projectbrief, productContext, activeContext, systemPatterns, techContext)
- Draggable floating windows (Theme Manager, Language Manager)
- Dockable panels with unified sidebar support and tabbed interface
- Auto-centering for floating windows on resize (smoother and smarter behavior)
- Electron-based architecture established
- Internationalization system in place (i18n-manager.js)
- Theme management system with localStorage
- Game management system (game-manager.js) with multiple functional views (Cover, List, Table, Slideshow, Random)
- Multi-language support with locale files
- Webpack build system configured
- Memory Card Editor tool (Full-stretch responsive layout, dual-pane management)
- Dedicated "Tools" navigation and overview view

## What
- Complete implementation of game detection and library management
- Full theme management system with custom theme creation
- Implement duplicate theme detection (include all color codes in filename to detect if there are already themes with exact same colors shared/uploaded)
- Complete tools management system
- Advanced game library features (search, filters, sorting)
- Performance optimization for large game collections
- Testing strategies and test coverage
- Deployment procedures and packaging

## Recent Changes
- Fixed infinite renderer RAM growth when switching themes in Library/Cover view:
  - Confirmed issue was native renderer/compositor memory pressure rather than JS heap growth
  - Tuned cover incremental rendering in `js/game-manager.js` to keep fewer chunks/cards resident
  - Scoped lazy image observation to library scroll root in `js/game-manager/lazy-game-images.js` to improve load/unload behavior
  - Removed expensive cover-view visual effects in `scss/games/_core-cover.scss` (blur/shimmer/backdrop-heavy paths)
  - Result: memory now stabilizes after warmup instead of increasing unbounded to GBs
- Fixed category single-mode Ctrl/Cmd multi-select behavior in sidebar categories (logic + visual state)
- Fixed category mode button text interpolation so `{{mode}}` is always rendered to concrete text
- Replaced Library `Installed` section with `Favorite` (games rated with stars / `rating > 0`)
- Added compatibility mapping so legacy stored `installed` default section resolves to `favorite`
- Normalized title-row height treatment across Cover/List/Table to better match Slideshow/Random presentation
- Decoupled logo brand color from global brand color (`--logo-brand-color`) so logo span toggle no longer alters sidebar branding
- Added Font Awesome brand icons for community/social cards
- Fixed Theme Manager custom-theme delete icon rendering and hover action icon consistency
- Improved grouped game rendering behavior and lazy-load batching
- Added markdown rendering for Support view suggested fix steps
- Improved LLM-driven theme generation variance, prompt controls, and color update consistency
- Moved runtime backup rule editing into Emulator Edit modal and removed it from Library Settings modal
- Added emulator-specific `runtimeDataRules` and wired launch payloads so backup matching can be controlled per emulator
- Added game session overlay controls (show launcher, Alt+Enter, screenshot, quit) with active session polling
- Added BIOS Manager tool implementation with platform BIOS listing, file import, and folder open actions
- Updated launch backend to set `lastPlayed` on successful launch for Recently Played reliability
- Refactored `renderer.js` by extracting reusable modules:
  - `js/suggestions-settings.js`
  - `js/suggestions-core.js`
  - `js/suggested-results-view.js`
  - `js/tag-categories.js`
  - `js/ui/glass-message-dialog.js`
  - `js/ui/llm-tagging-dialogs.js`
  - `js/drag-drop-manager.js`
  - `js/window-ui-manager.js`
  - `js/settings/library-settings-modal.js`
  - `js/events/setup-renderer-events.js`
  - `js/profile/profile-modal.js`
  - `js/library/categories-list-renderer.js`
- Reduced renderer surface area and duplicated logic in suggestion/tagging/category flows
- Moved drag/drop import flow out of `renderer.js` into `js/drag-drop-manager.js` and wired via dependency injection callbacks
- Moved window chrome/sidebar/toggle/resize UI handlers into `js/window-ui-manager.js`
- Moved the large settings modal implementation out of `renderer.js` into `js/settings/library-settings-modal.js` with a thin wrapper in renderer
- Moved renderer event wiring into `js/events/setup-renderer-events.js` with dependency injection and state getters
- Moved profile modal UI into `js/profile/profile-modal.js` with a thin wrapper in renderer
- Moved categories sidebar rendering and tag-mutation workflows into `js/library/categories-list-renderer.js` and kept a small renderer wrapper
- Implemented Memory Card Editor with professional dual-pane table-based layout
    - Optimized layout to fill 100% of available space by using absolute positioning and flex-grow
    - Fixed responsive behavior with media queries and stacked layouts for smaller windows
    - Refined table visualization with sticky headers and responsive columns
    - Implemented file-based upload flow for both memory card slots using native file dialogs
    - Added centralized operation controls and bottom action bars
    - Extracted PS1 save icons from memory card files and rendered them in the UI (32x32px size)
    - Debugged and fixed issues with icon rendering (path: null error, incorrect palette/bitmap decoding)
- Added dedicated "Tools" navigation logic to header
    - Created a "Tools Overview" grid view to browse available utilities
    - Implemented seamless switching between the library and tools views
    - **Implemented responsive header with dynamic element visibility and layout adjustments based on screen size.**
- Implemented temporary theme inversion logic for `toggleTheme` (Light <-> Dark color flipping)
- Implemented automatic webhook re-configuration when theme upload fails (e.g., if webhook is deleted on Discord)
- Fixed critical bugs in `GamepadManager`
    - Resolved `TypeError` crash by implementing robust undefined checks and filtering
    - Fixed Bluetooth controller detection by supporting both standard `GamepadEvent` and direct gamepad object payloads
    - Implemented `syncWithNativeAPI` polling fallback to ensure robust detection and fresh state updates for all controllers
- Added future roadmap TODO bank in `memory-bank/activeContext.md` for:
  - Auto save-state/memory-card backup
  - Auto screenshot capture for future multi-cover support
  - In-app game overlay controls
  - BIOS management
  - Controller-first UI navigation
  - Emulator update + save data migration

## Current Status
- Documentation foundation established
- Core architectural patterns defined
- Basic UI components and structure in place
- Internationalization and theme systems partially implemented
- Main process and renderer process communication patterns established

## Known Issues
- Need to implement full game detection and organization features
- Theme system needs more comprehensive custom theme support
- Tools management system requires complete implementation
- Performance optimization for large libraries needed
- Testing coverage is minimal

## Evolution of Project Decisions
- Started with documentation-first approach
- Established Electron architecture early
- Prioritized modular design with separate managers
- Decided on localStorage for theme persistence
- Chose i18n.js for internationalization
- Implemented IPC communication patterns
- Added "Refresh Themes" button in marketplace to fetch community themes from GitHub dynamically
- Implemented a unified docking system for floating panels with tabbed sidebar support
- Fixed and perfected window docking persistence, layout shift, and transition logic
