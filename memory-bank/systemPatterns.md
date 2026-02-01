# System Patterns

## System Architecture
emuBro-Reloaded follows an Electron-based architecture with clear separation between main and renderer processes:

### Main Process
- Handles system-level operations
- Manages file system access
- Controls window management
- Implements IPC communication
- Manages game detection and emulator integration
- Handles application lifecycle events

### Renderer Process
- Manages UI rendering
- Handles user interactions
- Implements theme management
- Manages internationalization
- Controls game library display
- Handles tool management

## Key Technical Decisions
- IPC communication for main/renderer process communication
- Modular architecture with separate managers for different functionalities
- localStorage for theme persistence
- i18n.js for internationalization (Simple I18n class with singleton instance, supports dot-notation keys, fallback to English, and language change listeners)
- Component-based UI design
- Responsive design for different screen sizes

## Design Patterns in Use
- Manager Pattern: Separate managers for themes, games, internationalization, and tools
- Observer Pattern: For language change notifications
- Factory Pattern: For theme creation and management
- Singleton Pattern: For global state management where appropriate

## Component Relationships
- Theme Manager interacts with Theme Selector UI
- Game Manager communicates with Game Library UI
- i18n Manager handles UI translation updates
- Tools Manager interfaces with Tools section UI
- All managers communicate with the main process through IPC

## Critical Implementation Paths
1. Main process IPC handlers for game data, theme data, and language data
2. Renderer process UI components for library, themes, and tools
3. Theme management system with custom and community themes
4. Internationalization system with language selector
5. Game detection and library organization system