# Steam Clone Electron Application

A Steam-like desktop application built with Electron, showcasing a game library interface with installation and management features.

## Features

- **Game Library Display**: Shows games with images, titles, genres, ratings, and prices
- **Interactive Game Cards**: Install, uninstall, and launch games
- **Filtering and Sorting**: Filter by genre and sort by name, rating, or price
- **User Profile**: Displays user information and library statistics
- **Responsive Design**: Works on different screen sizes

## Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

To start the application:
```bash
npm start
```

To run in development mode with hot reloading:
```bash
npm run dev
```

## Project Structure

```
.
├── main.js              # Main Electron process
├── index.html           # Main application UI
├── styles.css           # Application styling
├── renderer.js          # Frontend logic
├── package.json         # Project dependencies and scripts
└── README.md            # This file
```

## Dependencies

- [Electron](https://electronjs.org/) - Desktop application framework
- [electron-log](https://github.com/megahertz/electron-log) - Logging for Electron
- [electron-store](https://github.com/sindresorhus/electron-store) - Persistent data storage
- [axios](https://github.com/axios/axios) - HTTP client
- [node-ipc](https://github.com/RIAEvangelist/node-ipc) - Inter-process communication

## Building

To build the application for distribution:
```bash
npm run build
```

## License

MIT