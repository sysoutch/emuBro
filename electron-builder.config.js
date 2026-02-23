const shipEnglishOnlyLocales = String(process.env.EMUBRO_SHIP_EN_ONLY || "1").trim() !== "0";

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
    ...(shipEnglishOnlyLocales ? ["locales/en.json"] : ["locales/**/*"]),
    "logo.png",
    "favicon.ico",
    "emubro-resources/**/*", // Essential for your app to find configs/platforms
    "!emubro-locales-repo/**/*",
    "!build_out/**/*"
  ],
  protocols: [
    {
      name: "emuBro Launcher",
      schemes: ["emubro"]
    }
  ],
  publish: [
    {
      provider: "github",
      owner: "sysoutch",
      repo: "emuBro",
      releaseType: "release"
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
    icon: "favicon.ico",
    artifactName: "${productName}-${version}-win-${arch}.${ext}",
    target: [
      "nsis",
      "nsis-web"
    ],
    asar: true
  },
  linux: {
    icon: "icon.png",
    artifactName: "${productName}-${version}-linux-${arch}.${ext}",
    target: [
      "AppImage",
      "deb"
    ],
    category: "Game"
  },
  mac: {
    icon: "favicon.ico",
    artifactName: "${productName}-${version}-mac-${arch}.${ext}",
    target: []
  }
};
