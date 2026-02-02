# Active Context

## Current Work Focus
The current focus is on updating project documentation and maintaining the codebase to align with the new Electron-based architecture.

## Recent Changes
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

## Next Steps
1. Push changes to remote repository (if requested)
2. Verify all views are rendering correctly in the application
2. Complete systemPatterns.md with architectural decisions
3. Create techContext.md with technology stack details
4. Implement progress.md to track development status
5. Begin implementing core features based on documented patterns
6. Update documentation as features are implemented

## Active Decisions and Considerations
- Using CSS Grid for the main `games-container` but `flex-column` or `block` overrides (via `grid-column: 1 / -1`) for non-grid views like List, Table, and Slideshow
- Extending Glass Effect (backdrop-filter) to all view containers for consistency when enabled
- Using Electron for cross-platform compatibility
- Implementing Steam-like interface design
- Supporting multiple themes through localStorage
- Multi-language support through i18n system
- Modular architecture with separate managers for different functionalities

## Important Patterns and Preferences
- Component-based architecture
- IPC communication between main and renderer processes
- Theme management through localStorage
- Internationalization using i18n.js
- Responsive design for different screen sizes

## Learnings and Project Insights
- When dynamically generating HTML classes in JS (e.g. `list-item-image`), ensure strict synchronization with SCSS selectors
- `scss/_games.scss` serves as the central stylesheet for all game visualization modes, not just the default grid
- The project requires careful consideration of Electron's main vs renderer process architecture
- Theme customization needs to be well-structured for both custom and community themes
- Internationalization should be implemented early to support multi-language features
- Game library management will be a core feature requiring robust data handling