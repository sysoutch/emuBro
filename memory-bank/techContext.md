# Technical Context

## Technologies Used
- Electron.js: Cross-platform desktop application framework
- JavaScript/ES6+: Primary programming language
- HTML5/CSS3: UI structure and styling
- i18n.js: Internationalization library
- Webpack: Module bundling and build automation
- localStorage: Client-side data persistence

## Development Setup
- Node.js environment
- npm package manager
- Electron development tools
- Webpack build system
- Git version control

## Technical Constraints
- Cross-platform compatibility (Windows, macOS, Linux)
- Performance optimization for game library browsing
- Secure file system access for game detection
- Responsive UI design for different screen sizes
- Efficient theme loading and switching

## Dependencies
- electron: Main Electron framework
- i18n: Internationalization support
- webpack: Module bundler
- css-loader: CSS processing
- style-loader: Style loading

## Tool Usage Patterns
- Webpack for bundling and building the application
- Electron's IPC for communication between processes
- localStorage for persisting user preferences
- CSS modules for scoped styling
- Git for version control and collaboration

## Implementation Approach
- Modular code structure with separate files for different functionalities
- Component-based UI design
- Asynchronous operations for file system access
- Error handling for game detection and emulator integration
- Performance optimization for large game libraries

## PS1 Memory Card Icon Rendering (Summary)

### 1. File Structure & Offsets
*   **Directory Block (0x00 - 0x1FFF):** Contains the save metadata (Title, Product ID). It does NOT contain the icon image data.
*   **Data Blocks (0x2000+):** Icons live in the first 1KB of the save's actual data blocks.
*   **Offset Calculation:** For a raw `.mcr` file, Block `i` starts at `(i * 8192)`. Note that Block 0 is the directory, so Save Slot 1 starts at `8192`.

### 2. Icon Data Format (Indexed)
*   **CLUT (Palette):** 32 bytes starting at offset `0x60` of the Data Block.
*   **Pixel Bitmap:** 128 bytes starting at offset `0x80` of the Data Block.
*   **Bit Depth:** PS1 icons are 4-bit (16 colors). One byte contains two pixels (Nibbles).
*   **Color Space:** The palette uses 15-bit BGR (not RGB). Colors must be bit-shifted (e.g., `(val & 0x1F) << 3`) to convert to 8-bit RGB for the web.

### 3. Implementation Details
*   **Transparency:** Color Index 0 in the palette is usually reserved for transparency.
*   **IPC Serialization:** Electron's `ipcMain` can transform `Buffer` objects into JSON-like objects `{type: 'Buffer', data: []}`. Ensure the renderer handles both formats.
*   **Canvas API:** Raw pixels must be expanded from 4-bit pointers to 32-bit RGBA `Uint8ClampedArray` for `putImageData` to work.
