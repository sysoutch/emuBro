module.exports = {
  appId: "ch.sysout.emubro",
  productName: "emuBro",
  directories: {
    output: "build_out"
  },
  npmRebuild: true,
  asarUnpack: [
    "**/*.node"
  ],
  files: [
    "package.json",
    "main.js",
    "main/**/*",
    "preload.js",
    "ps1-handler.js",
    "index.html",
    "game-session-overlay.html",
    "i18n.js",
    "translations-loader.js",
    "js/game-session-overlay-window.js",
    "dist/**/*",        // Your Webpack output
    "locales/**/*",
    "logo.png",
    "icon.png",
    "emubro-resources/**/*", // Essential for your app to find configs/platforms
    "!build_out/**/*"
  ],
  protocols: [
    {
      name: "emuBro Launcher",
      schemes: ["emubro"]
    }
  ],
  extraResources: [
    {
      "from": "resources",
      "to": "bin",
      "filter": ["**/*"]
    }
  ],
  // electron-builder will now automatically include production 
  // dependencies from package.json in the final build.
  win: {
    target: "nsis",
    asar: true
  },
  linux: {
    target: [
      "AppImage",
      "deb"
    ],
    category: "Game"
  },
  mac: {
    target: [
      "dmg",
      "zip"
    ]
  }
};
