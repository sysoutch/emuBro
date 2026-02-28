# emuBro

## :information_source: About emuBro

emuBro is an open source retro game launcher for Windows, Linux, and macOS. It allows you to manage all your games and emulators such as snes9x, epsxe, pcsx2, dolphin, or whatever you like.

This is now migrating to a **Tauri + Vue + Pinia** desktop stack for a lighter, faster, native-backed experience.
Legacy Electron code is still kept in this repo during the porting phase.

![](https://preview.redd.it/zpx8ciq23a831.png?width=600&format=png&auto=webp&v=enabled&s=fc5c19c4f90500b829bd709fca996c38770af01c "Retro Game Launcher for cool kids")

## :fire: Features
- User-friendly interface
- Automatic game scanning and organization
- Download game covers, emulators, and tags
- Add game IDs
- Different views
- Export gamelist to JSON
- Discord Rich Presence
- **New:** LLM Support Assistant with troubleshooting + general chat modes
- **New:** Modern architecture using Web Technologies (HTML/CSS/JS)
- **New:** Enhanced theming engine (SASS-based)

## :robot: LLM Support Assistant

emuBro includes an in-app Support Assistant that can answer both emulator troubleshooting questions and app-specific "how do I use emuBro?" questions.

### Support Modes
- **Troubleshoot mode**  
  Structured diagnostic output for emulator/runtime problems.
- **General Chat mode**  
  Conversational Q/A about emuBro features, workflows, settings, tools, and launcher integrations, with follow-up support.

### Retrieval-Augmented Grounding (RAG-lite)
Before sending a prompt to the LLM, emuBro builds local context from:
- **Platform configs** in `emubro-resources/platforms/*/config.json`
  - platform capabilities
  - supported file/image/archive types
  - recommended emulators
  - emulator launch parameters
  - BIOS-required hints
  - Linux installer metadata (Flatpak/APT when available)
  - launcher integration metadata (for PC config where present)
- **Local DB state**
  - installed emulators (name/platform/path)
  - matching games in library (name/platform/code/path)
  - library size and install-state summary

This local context is injected into the prompt as primary grounding so answers are based on your current emuBro setup, not only model guesswork.

### emuBro-aware Responses
The assistant is designed to handle:
- emulator issues (launch failures, graphics/audio problems, setup mistakes)
- emuBro feature questions (views, filters, tools, imports, launcher scan flow, etc.)
- practical next-step guidance based on your local installation and config data

### Follow-up Conversation
In **General Chat** mode:
- user/assistant turns are kept as chat history
- follow-up questions use prior conversation context
- history is stored locally for continuity between sessions

### Support Form Enhancements
- **Insert PC Specs** button in Support view (Windows-focused system snapshot via WMIC/PowerShell fallback)
- optional fields for platform, emulator, exact error text, and extra details
- provider/model from Settings -> AI / LLM

### Supported Providers
- Ollama
- OpenAI-compatible chat endpoints
- Gemini-compatible endpoints

### Safety Constraints
The support prompt explicitly blocks piracy/cracked BIOS guidance and focuses on legal troubleshooting and valid setup steps.

## :warning: Prerequisites

### For Users
- No additional software is required (Java is **no longer** needed). Just download and run!

### For Developers
- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- [Git](https://git-scm.com/)
- [Rust](https://www.rust-lang.org/tools/install) (required by Tauri)

## :wrench: Installation

### Download Release
1. Download the latest version of emuBro from the releases page.
2. Run the installer (or executable).
3. Launch emuBro and start playing your favorite classic games.

### Build from Source
If you want to run the latest development version:

1. Clone the repository:
   ```bash
   git clone https://github.com/sysoutch/emuBro.git
   cd emuBro
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm start
   ```

### Migration Commands
- `npm run dev` starts the new Tauri + Vue + Pinia app.
- `npm run dev:web` starts only the Vue frontend (no Tauri shell).
- `npm run build` builds the new Tauri desktop app.
- `npm run legacy:electron:start` still runs the old Electron app while features are being ported.

## :white_check_mark: Usage
1. Launch emuBro
2. Browse and select a game to play
3. Use the keyboard controls or connect a controller to play

## :construction: What needs to be done

- Game Cover Manager
- Multiple versions of tag names (free-to-play, f2p)
- More Brotoshop features
- File queue to check checksum
- Add multiple games
- Group tags and search field
- Ask to Download / Search for resource package when missing

## :framed_picture: Themes

emuBro has a bunch of nice looking dark and light themes already installed and features a rich theme management system. You can install new themes from the theme manager.

### Dark Themes
A few examples of some of the dark themes:
[![](https://emubro.net/images/screenshots/emuBro-SS00.png)](https://emubro.net/images/screenshots/emuBro-SS00.png "emuBro Screenshot")

[![](https://emubro.net/images/screenshots/emuBro-SS01.png)](https://emubro.net/images/screenshots/emuBro-SS01.png "emuBro Screenshot")

[![](https://emubro.net/images/screenshots/emuBro-SS02.png)](https://emubro.net/images/screenshots/emuBro-SS02.png "emuBro Screenshot")

[![](https://emubro.net/images/screenshots/emuBro-SS03.png)](https://emubro.net/images/screenshots/emuBro-SS03.png "emuBro Screenshot")

## :heart: Social
- [emubro.net *(Official Website)*](https://emubro.net "Official emuBro Website")
- [Discord](https://discord.gg/EtKvZ2F "Official emuBro Discord Server")
- [YouTube](https://www.youtube.com/channel/UC9zQuEiPjnRv2LXVqR57K1Q "emuBro on YouTube")
- [Reddit](https://www.reddit.com/r/emuBro "emuBro Subreddit")
- [Twitter](https://twitter.com/emuBro "emuBro on Twitter")
- [Instagram](https://www.instagram.com/emubro.network/ "emuBro on Instagram")
- [Facebook](https://www.facebook.com/emubr0 "emuBro on Facebook")

## :pray: Contributing
If you would like to contribute to emuBro, please fork the repository and submit a pull request. We welcome contributions for bug fixes, new features, and themes!
