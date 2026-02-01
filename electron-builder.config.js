module.exports = {
  appId: "ch.sysout.emubro",
  productName: "emuBro",
  directories: {
    output: "build_out"
  },
  files: [
    "package.json",
    "main.js",
    "index.html",
    "i18n.js",
    "translations-loader.js",
    "dist/**/*",        // Your Webpack output
    "locales/**/*",
    "logo.png",
    "emubro-resources/**/*", // Essential for your app to find configs/platforms
    "!build_out/**/*"
  ],
  extraResources: [
    {
      "from": "resources/${os}", // Grabs from your local /resources/win or /resources/mac
      "to": "bin",               // Puts them into a folder named 'bin' in the final app
      "filter": ["**/*"]
    }
  ],
  // electron-builder will now automatically include production 
  // dependencies from package.json in the final build.
  win: {
    target: "nsis",
    asar: true
  }
};